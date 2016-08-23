/*

Add filters/conditions for Tags
Improve configuration and defaults
Add logic to update Alarm thresholds in case of modifying storage capacity
Delete alarms in case of Delete API events
Add Alarms for:
    - DyanmoDB Throttling Events / Consumed Capacity (?)
    - Lambda Throttling
    - CPU Credits for T2
    - IO Credits for GP2 volumes
    - ELB SurqueQueue / SpillOver
    - Replica lag for RDS Read Replicas (CreateDBInstanceReadReplica)
    
*/

'use strict';
console.log('Loading function');

// Dependencies
let AWS = require('aws-sdk');
//AWS.config.logger = process.stdout;

// Global Confg
const config = {};
config.matching_events = ['RunInstances', 'CreateVolume', 'CreateDBInstance'];
config.matching_tag = { Key: 'test-cwe', Value: '' };
config.thresholds = {};
config.thresholds.storage_pct = 10;

// config.thresholds.service
config.defaults = {
    ComparisonOperator : 'LessThanOrEqualToThreshold',
    EvaluationPeriods : 3,
    Period : 300,
    AlarmActions: [
        'arn:aws:sns:us-east-1:903745515320:NotifyMe',
    ],
    Statistic: 'Average'
};

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

    var create_alarm = isResourceTagged(event.detail, function(data) {
        console.log
    }

    if (create_alarm) {

        console.log('bla');
        // Check eventName from API call
        switch(event_name) {

            case "CreateVolume":
                console.log('Alarms for EBS volumes');
                break;

            case "RunInstances":
                console.log('Alarms for EC2 Instances');
                createAlarmsForEc2(response, callback);
                break;

            case "CreateDBInstance":
                console.log('Alarms for RDS Instances');
                createAlarmsForRds(response, callback);
                break;

            default:
                callback('Something went wrong');

        }    
    }

};

function isResourceTagged(detail, callback) {

    // Extract Source Service and Response to get resource ids
    const source = detail.eventSource.split(".")[0];
    const response = detail.responseElements;

    switch(source) {

        case "rds":

            isRdsTagged(response, function(data) {
                console.log('rdsTagged: ', data);
                callback(data);
            });

            break;

        case "ec2":

            var tags = getTagsForEc2(response);
            return(false);

            break;

        default:
            return false;
    }
}

function createAlarmsForRds(response, callback) {

    var cloudwatch = new AWS.CloudWatch();
    
    // Calculate Threshold  (percentage of current storage, from GBs to Bytes)
    const threshold = response.allocatedStorage * 1024 * 1024 * 1024 * config.thresholds.storage_pct / 100;
    
    var params = {
        AlarmName: 'RDS Free Storage Available - ' + response.dBInstanceIdentifier,
        ComparisonOperator: config.defaults.ComparisonOperator,
        EvaluationPeriods: config.defaults.EvaluationPeriods,
        MetricName: 'FreeStorageSpace',
        Namespace: 'AWS/RDS',
        Period: 60,
        Statistic: config.defaults.Statistic,
        Threshold: 10,
        //AlarmDescription: 'STRING_VALUE',
        Dimensions: [
            {
              Name: 'DBInstanceIdentifier',
              Value: response.dBInstanceIdentifier
            }
        ],
        AlarmActions: config.defaults.AlarmActions
    };

    cloudwatch.putMetricAlarm(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });
}

function createAlarmsForEc2(response, callback) {
    
    var cloudwatch = new AWS.CloudWatch();
    
    response.instancesSet.items.forEach(function(instance) {
        
        var params = {
            AlarmName: 'EC2 CPU Credits available - ' + instance.instanceId,
            ComparisonOperator: config.defaults.ComparisonOperator,
            EvaluationPeriods: config.defaults.EvaluationPeriods,
            MetricName: 'CPUCreditBalance',
            Namespace: 'AWS/EC2',
            Period: config.defaults.Period,
            Statistic: config.defaults.Statistic,
            Threshold: 10,
            //AlarmDescription: 'STRING_VALUE',
            Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instance.instanceId
                }
            ],
            AlarmActions: config.defaults.AlarmActions
        };
        
        cloudwatch.putMetricAlarm(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
        });

    });

}

function isRdsTagged(response, callback) {

    var rds = new AWS.RDS();

    var params = {
        ResourceName: response.dBInstanceArn
    };

    console.log('Getting Tags for resource: ', response.dBInstanceIdentifier);

    rds.listTagsForResource(params, function(err, data) {
        if (err) console.log(err, err.stack);

        else {

            //console.log(data);

            // Compare Tags with Pattern
            for (var i = 0; i < data.TagList.length; ++i) {

                //data.TagList.forEach(function(tag, index, array) {
                if (config.matching_tag.Key == data.TagList[i].Key &&
                    config.matching_tag.Value == data.TagList[i].Value) {

                    console.log('Matching tag: ', data.TagList[i]);

                    // Found matchinbg tag
                    break;

                }
            };

            if (i == data.TagList.length) callback(false); // No matching tag found
            else callback(true);                           // loop ended before end of array
        }

    });
}