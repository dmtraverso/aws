#!/bin/bash

aws dynamodb create-table --table-name Tracking \
--key-schema AttributeName=username,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
--attribute-definitions AttributeName=username,AttributeType=S AttributeName=timestamp,AttributeType=N  \
--provisioned-throughput ReadCapacityUnits=17,WriteCapacityUnits=5

aws kinesis create-stream --stream-name test-date --shard-count 1
