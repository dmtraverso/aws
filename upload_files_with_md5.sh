#!/bin/bash
# Gets files from directory and upload them to S3 (single command)
ORIGIN=/mnt/test
HASH_LEN=4
DEST_BUCKET=perf.test.scanboo
cd $ORIGIN
for i in `ls -1 -f *`; do
  MD5=`echo -n $i | md5sum | cut -f1 -d ' '`
  S3_NAME="${MD5:0:$HASH_LEN}-$i"
  aws s3 cp $i s3://$DEST_BUCKET/$S3_NAME
done
