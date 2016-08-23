console.log('Loading function');

var aws = require('aws-sdk');
var docClient = new aws.DynamoDB.DocumentClient();

// returns time in seconds in string
function now() {
  var d = new Date();
  return Math.round(d.getTime() / 1000);
}

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Parameters object for DynamoDB query
    var params = {};
    var curr_time = now();
    
    // Get parameters from API Gateway request
    var action = event.action;
    var userid = event.userid;
    var start_time = event.start_time;
    
    // Depending on the action modify params for DynamoDB query
    switch (action) {
        case 'load':
            console.log('Loading graph data for user: ', userid);
            params.TableName = 'Tracking';
            params.KeyConditionExpression =  'username = :hasval AND #T <= :rangeval1';
            // timestamp and count are reserved words in DynamoDB
            params.ExpressionAttributeNames = {
                '#T'    : 'timestamp',
                "#C"    : 'count'
            };
            params.ExpressionAttributeValues = {
                ':hasval'       : userid,
                ':rangeval1'    : curr_time
            };
            params.ProjectionExpression = 'username, #T, #C';
            params.ScanIndexForward = false;
            params.Limit = 10;
            break;

        case 'refresh':
            if (start_time === "" || start_time === "undefined") {
                context.fail(new Error('Missing start_time paramter'));
            }
            console.log('Refreshing graph data for user: ' + userid + " and start_time: " + start_time);
            params.TableName = 'Tracking';
            params.KeyConditionExpression =  'username = :hasval AND #T >= :rangeval1';
            // timestamp and count are reserved words in DynamoDB
            params.ExpressionAttributeNames = {
                '#T'    : 'timestamp',
                "#C"    : 'count'
            };
            params.ExpressionAttributeValues = {
                ':hasval'       : userid,
                ':rangeval1'    : Number(start_time)
            };
            params.ProjectionExpression = 'username, #T, #C';
            break;
        case 'heatmap':
            console.log('Getting heatmap data for user: ', userid);
            params.TableName = 'Tracking';
            params.KeyConditionExpression =  'username = :hasval AND #T <= :rangeval1';
            // timestamp and count are reserved words in DynamoDB
            params.ExpressionAttributeNames = {
                '#T'    : 'timestamp'
            };
            params.ExpressionAttributeValues = {
                ':hasval'       : userid,
                ':rangeval1'    : curr_time
            };
            params.ProjectionExpression = 'username, #T, movs';
            params.ScanIndexForward = false;
            params.Limit = 15;
            break;
        default:
            context.fail(new Error('Unrecognized action "' + action + '"'));
    }
    
    // Execute Query in DynamoDB
    docClient.query(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);      // an error occurred
        }
        else {                              // successful response
          console.log(data);
        }
        //context.succeed('OK');
        context.succeed(data.Items);
    }); 
}