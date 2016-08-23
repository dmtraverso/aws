from __future__ import print_function

import logging
import json
import boto3

# Logger config
logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.info('Loading function')

# Configuration, Class?
matched_events = ['RunInstances', 'CreateVolume', 'CreateDBInstance']
matched_tags = {'Key': 'test-cwe', 'Value': ''}


def lambda_handler(event, context):

    # logger.info("Received event: " + json.dumps(event, indent=2))
    # raise Exception('Something went wrong')

    # Check if event should be considered
    if not valid_event(event):
        return 'Ouch'

    logger.info('Matched event')

    return create_alarms(event)


def create_alarms(event):

    # Get Source Service
    event_source = event['source'].split('.')[1]
    response_elements = event['detail']['responseElements']

    if event_source == 'rds':
        return create_alarms_for_rds(response_elements)

    if event_source == 'ec2':
        return create_alarms_for_ec2(response_elements)


def valid_event(event):

    event_type = event['detail']['eventType']

    if event_type != 'AwsApiCall':
        logger.error(
            'Skipping event as it is not an AwsApiCall: %s ' % event_type)
        return False

    event_name = event['detail']['eventName']

    if event_name not in matched_events:
        logger.error('Skipping event as it is not one of: %s' % matched_events)
        return False

    # Event matches pattern
    return True


def create_alarms_for_rds(response_elements):

    client = boto3.client('rds')
    response = client.list_tags_for_resource(
        ResourceName=response_elements['dBInstanceArn']
    )

    # Check Tags for the RDS instance
    for tag in response['TagList']:
        if (tag['Key'] == matched_tags['Key'] and
                tag['Value'] == matched_tags['Value']):
            # some comment
            logger.info('Tag matches')
            return True

    return False


def create_alarms_for_ec2(response_elements):

    client = boto3.client('ec2')
    instance_ids = []

    # Check Tags for all EC2 instances created by RunInstances
    for instance in response_elements['instancesSet']['items']:
        instance_ids.append(instance['instanceId'])

    response = client.describe_tags(
        Filters=[
            {'Name': 'resource-id', 'Values': instance_ids},
            {'Name': 'key', 'Values': [matched_tags['Key']]},
            {'Name': 'value', 'Values': [matched_tags['Value']]}
        ])

    print(response)
