'use strict';
console.log('Loading function');

// Dependencies
let AWS = require('aws-sdk');

// Global Confg
const config = {};
config.matching_events = ['RunInstances', 'CreateVolume', 'CreateDBInstance'];
config.matching_tags = [];
config.thresholds = {};
config.thresholds.storage_pct = 10;

exports.handler = (event, context, callback) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Check if it is an AWS API call
    if (event.detail.eventType !== "AwsApiCall") {
        callback(null, 'Skipping event: not an AwsApiCall');
    }
    
    const event_name = event.detail.eventName;
    // Check if it matches the event pattern
    if (config.matching_events.indexOf(event_name) == -1) {
        callback(null, 'Skipping event: it is not one of ' + (config.matching_events).toString());
    }
    
    console.log("Matched event");
    const response = event.detail.responseElements;

    // Check eventName from API call
    switch(event_name) {
        case "CreateVolume":
            console.log('Alarms for EBS volumes');
            break;
        case "RunInstances":
            console.log('Alarms for EC2 Instances');
            break;
        case "CreateDBInstance":
            console.log('Alarms for RDS Instances');
            createAlarmsForRds(response, callback);
            break;
        default:
            callback('Something went wrong');
    }
        
        /*
        // If it is not a GP2 volume (maybe also check TAGs)
        if (volume.volumeType !== "gp2") {
            callback(null, "Skipping volume " + volume.volumeId + ", not GP2");
        }*/
        
        // Calculate credits
        // create alarm
        console.log("Create alarm");
    
    callback(null,'OK');
};

function createAlarmsForRds(response, callback) {
    var cloudwatch = new AWS.CloudWatch();
    
    // Calculate Threshold  (percentage of current storage, from GBs to Bytes)
    const threshold = response.allocatedStorage * 1024 * 1024 * 1024 * config.thresholds.storage_pct / 100;
    
    var params = {
	DryRun: true,
        AlarmName: 'RDS Free Storage Available - ' + response.dBInstanceIdentifier,
        ComparisonOperator: 'LessThanOrEqualToThreshold',
        EvaluationPeriods: 2,
        MetricName: 'FreeStorageSpace',
        Namespace: 'AWS/RDS',
        Period: 60,
        Statistic: 'Average',
        Threshold: threshold,
        //AlarmDescription: 'STRING_VALUE',
        Dimensions: [
            {
              Name: 'DBInstanceIdentifier',
              Value: response.dBInstanceIdentifier
            }
        ],
        AlarmActions: [
            'arn:aws:sns:us-east-1:903745515320:NotifyMe',
        ]
    };
    
    cloudwatch.putMetricAlarm(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });
}
