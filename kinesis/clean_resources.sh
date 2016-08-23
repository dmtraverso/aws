#!/bin/bash

# Clean DynamoDB
for table in `aws dynamodb list-tables --query 'TableNames[*]' --output text`; do
  aws dynamodb delete-table --table-name $table;
done

# Clean Kinesis
for stream in `aws kinesis list-streams --query 'StreamNames[*]' --output text`; do
  aws kinesis delete-stream --stream-name $stream;
done
