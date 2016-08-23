#!/usr/bin/env python

import boto3

PATH_PREFIX = '/demo/'
USER_PREFIX = 'ln_user_'
TOTAL_USERS = 5
GROUP_NAME = 'DemoGroup'

result = []
client = boto3.client('iam')

print "Creating IAM group '%s'..." % GROUP_NAME,

iam = boto3.resource('iam')
group = iam.Group(GROUP_NAME)
response = group.create(Path=PATH_PREFIX)
response = group.attach_policy(PolicyArn="arn:aws:iam::aws:policy/PowerUserAccess")
print "OK"

print "Creating %s IAM users..." % TOTAL_USERS,

for suffix in xrange(0,TOTAL_USERS):
	username = USER_PREFIX + str(suffix)
	# Create IAM user
	user = client.create_user(
		UserName = username,
		Path = PATH_PREFIX
	)
	# Generate an AccessKey for the same user
	credentials = client.create_access_key(
    	UserName= username
	)
	# Attach User to Group
	group.add_user(UserName=username)
	# Save user + credentials
	result.append({
		'UserName' : credentials['AccessKey']['UserName'],
		'AccessKey' : credentials['AccessKey']['AccessKeyId'],
		'SecretAccessKey' : credentials['AccessKey']['SecretAccessKey']
	})

# Print header
print "OK"
print "Username,AccessKey,SecretAccessKey"
for r in result:
	print r['UserName'] + ',' + r['AccessKey'] + ',' + r['SecretAccessKey']
