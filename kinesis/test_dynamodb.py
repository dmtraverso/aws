#!/usr/bin/python

import boto3
import time

dynamodb = boto3.resource('dynamodb')
now = int(round(time.time()))
movements = []
movements.append(dict(X=123,Y=456))
table = dynamodb.Table('Tracking')
table.put_item(
    Item={
        'username': 'test2',
        'timestamp': now,
        'movs': movements
    }
)

movements2 = [{'X': 768, 'Y': 910 }]
'''table.update_item(
    TableName='Tracking',
    Key={
        'username': {
            'S': 'test2'
        },
        'timestamp': {
            'N': str(now)
        }
    },
    UpdateExpression='SET movs = :val1',
    ExpressionAttributeValues={
        ':val1': {
            'L': str(movements2)
        }
    }
)'''

response = table.get_item(
    Key={
        'username': 'test2',
        'timestamp': 1439245531
        }
)
if 'Item' in response:
    print 'bla'
else:
    print 'no'
#item = response['Item']
#item['movs'].extend(movements2)
#table.put_item(Item=item)
#
#response = table.get_item(
#    Key={
#        'username': 'test2',
#        'timestamp': 1439245531
#        }
#)

print(response)
