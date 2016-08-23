#!/bin/bash
# Generates binary files with random names
DEST=/mnt/test
BIN_SIZE=100
LOOP_COUNT=1000
SPLIT_SIZE=25M
TEMP=`mktemp`
# Create binary file
dd if=/dev/urandom of=$TEMP bs=1M count=$BIN_SIZE
# Create destination dir
mkdir -p $DEST
cd $DEST
for i in `seq 1 $LOOP_COUNT`; do
  split -a 1 -b $SPLIT_SIZE -d $TEMP "$(date +%s%N | rev)."
done
rm -f $TEMP
