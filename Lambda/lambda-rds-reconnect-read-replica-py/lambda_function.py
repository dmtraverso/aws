import pymysql.cursors
import json
import logging
import boto3

logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.info('Loading function')

# RDS event id that indicates failover was completed
# http://docs.amazonwebservices.com/AmazonRDS/latest/UserGuide/USER_Events.html#RDS-EVENT-0046
FAILOVER_EVENT_ID = "RDS-EVENT-0046"
IO_ERRNO = '1236'


def lambda_handler(event, context):
    # Check if event is an SNS notification
    if event['Records'][0]['EventSource'] != "aws:sns":
        logger.info("Skipping: event source is not SNS")
        return

    # Get message from Event which should be a JSON string
    payload = event['Records'][0]['Sns']['Message']
    logger.info("Received message from SNS: %s" % payload)

    # Load content from JSON message
    message = json.loads(payload)

    # Get RDS Event id from the message, which is a link.
    # Split it by "#" and remove its trailing white space
    received_event_id = message['Event ID'].split("#")[1].rstrip()

    if received_event_id != FAILOVER_EVENT_ID:
        logger.info("Skipping: Received event %s does not equal defined"
                    "event %s" % (received_event_id, FAILOVER_EVENT_ID))
        return

    # Get instance identified to get its endpoint
    db_instance = message['Identifier Link'].split("SourceId:")[1].strip()
    logger.info("Getting endpoint for DBInstanceIdentifier: %s" % db_instance)
    # Descibe database instance
    client = boto3.client('rds')
    response = client.describe_db_instances(DBInstanceIdentifier=db_instance)
    db_endpoint = response['DBInstances'][0]['Endpoint']['Address']

    # Establish MySQL connection to databse
    logger.info("Stablishing connection to %s" % db_endpoint)
    connection = pymysql.connect(
        host=db_endpoint,
        user='root',
        password='Test123!',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor)

    cursor = connection.cursor()
    # Get Slave Status to see if we need to do something
    sql = "SHOW SLAVE STATUS"
    cursor.execute(sql)
    result = cursor.fetchone()

    # Exit if slave is running normally
    if (result['Slave_IO_Running'] == 'Yes' and
            result['Slave_SQL_Running'] == 'Yes'):
        logger.info('Slave running normally. Skipping')
        return

    # Check last IO error number
    if result['Last_IO_Errno'] == IO_ERRNO:
        logger.info("Found I/O error %s, calling procedure" % IO_ERRNO)
        # Get last position processed from the master
        curr_master_log = result['Master_Log_File'].split(".")[1]
        # Call RDS procedure to restart replication
        sql = "CALL mysql.rds_next_master_log(%s)"
        cursor.execute(sql, curr_master_log)
        result = cursor.fetchall()
        logger.info("Procedure result: %s" % result['Message'])
        return

    connection.close()
