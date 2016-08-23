console.log('Loading function');

var aws = require('aws-sdk');
var docClient = new aws.DynamoDB.DocumentClient();

// returns current time in seconds
function now() {
  var d = new Date();
  return Math.round(d.getTime() / 1000);
}

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    var curr_time = now();
    
    // Get parameters from API Gateway request and set defaults
    var user_id = event.user_id;
    var timestamp = event.timestamp;
    var count = (typeof event.count !== 'undefined' && event.count !== "") ? event.count : true;
    var limit = (typeof event.limit !== 'undefined' && event.limit !== "") ? event.limit : 10;
    var reverse = (typeof event.reverse !== 'undefined' && event.reverse !== "") ? event.reverse : false;
    
    // Parameters object for DynamoDB query
    var params = {};
    params.TableName = 'Tracking';
    params.Limit = limit;
    params.KeyConditionExpression =  'username = :hash_value AND #T > :range_value';
    // timestamp and count are reserved words in DynamoDB
    params.ExpressionAttributeNames = {
        '#T'    : 'timestamp',
        "#C"    : 'count'
    };
    params.ProjectionExpression = '#T, #C';
    params.ExpressionAttributeValues = {
        ':hash_value'   : user_id,
        ':range_value'  : Number(timestamp)
    };
    
    // Modify DynamoDB Query to return movements instead of count
    if (count === 'false' || count === false) {
        params.ProjectionExpression = '#T, movs';
        params.ExpressionAttributeNames = {
            '#T'    : 'timestamp'
        };
    }
    
    // Modify DynamoDB Query to return movements before specified timestamp
    if (reverse === 'true' || reverse === true) {
        params.KeyConditionExpression =  'username = :hash_value AND #T <= :range_value';
        params.ScanIndexForward = false;
    }

    // Execute Query in DynamoDB
    console.log('Loading graph data for user: ', user_id);
    docClient.query(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);      // an error occurred
        }
        else {                              // successful response
          console.log(data);
        }
        context.succeed(data.Items);
    }); 
};
