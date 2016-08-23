#!/usr/bin/env python

import boto3

PATH_PREFIX = '/demo/'
USER_PREFIX = 'ln_user_'
GROUP_NAME = 'DemoGroup'
result = []

iam = boto3.resource('iam')
group = iam.Group(GROUP_NAME)


print "Deleting IAM users with path prefix '%s' and user prefix '%s'" % (PATH_PREFIX, USER_PREFIX)

# Get all users under /demo/ path
client = boto3.client('iam')
users = client.list_users(PathPrefix=PATH_PREFIX)

for u in users['Users']:
	username = u['UserName']
	if username.startswith(USER_PREFIX):
		print username + "...",
		# Get all AccessKeys associated with this user
		keys = client.list_access_keys(UserName=username)
		# Delete all AccessKeys
		for k in keys['AccessKeyMetadata']:
			response = client.delete_access_key(
	    		UserName=username,
	    		AccessKeyId=k['AccessKeyId']
			)
		# Remove user from Group
		response = group.remove_user(UserName=username)
		# Delete user
		response = client.delete_user(
	    	UserName=username
		)
		print "OK"

# Finally, delete group
response = group.detach_policy(PolicyArn="arn:aws:iam::aws:policy/PowerUserAccess")
response = group.delete()