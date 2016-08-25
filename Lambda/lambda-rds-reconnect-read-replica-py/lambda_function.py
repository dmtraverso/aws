import pymysql.cursors
import json
import logging

logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.info('Loading function')

# RDS event id that indicates failover is completed
# http://docs.amazonwebservices.com/AmazonRDS/latest/UserGuide/USER_Events.html#RDS-EVENT-0046
FAILOVER_EVENT_ID = "RDS-EVENT-0047"


def lambda_handler(event, context):
    # Check if event is an SNS notification
    if event['Records'][0]['EventSource'] != "aws:sns":
        logger.info("Skipping: event source is not SNS")
        return

    # Get message from Event which should be a JSON string
    message = event['Records'][0]['Sns']['Message']
    logger.info("Received message from SNS: %s" % message)

    # Load content from JSON message
    event = json.loads(message)

    # Get RDS Event id from the message, which is a link.
    # Split it by "#" and remove its trailing white space
    received_event_id = event['Event ID'].split("#")[1].rstrip()

    if received_event_id != FAILOVER_EVENT_ID:
        logger.info("Skipping: Received event %s does not equal defined"
                    "event %s" % (received_event_id, FAILOVER_EVENT_ID))
        return

    # Connect to the database
    connection = pymysql.connect(
        host='test-cwe-replica.cnwuv7fujnvx.us-east-1.rds.amazonaws.com',
        user='root',
        password='Test123!',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor)

    try:
        with connection.cursor() as cursor:
            # Create a new record
            sql = "SHOW SLAVE STATUS"
            cursor.execute(sql)
            result = cursor.fetchone()

            # Exit if slave is running normally
            if (result['Slave_IO_Running'] == 'Yes' and
                    result['Slave_SQL_Running'] == 'Yes'):
                logger.info('Slave running normally. Skipping')
                return 'Ok'

            # Check last IO error number
            if result['Last_IO_Errno'] == 1236:
                # Get last position processed from the master
                curr_master_log = result['Master_Log_File'].split(".")[1]
                sql = "CALL mysql.rds_next_master_log(%s)"
                cursor.execute(sql, curr_master_log)
                result = cursor.fetchall()

                logger.info(result['Message'])
                return 'Ok'

    finally:
        connection.close()
