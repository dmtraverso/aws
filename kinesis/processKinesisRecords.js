console.log('Loading function');

var aws = require('aws-sdk');
var docClient = new aws.DynamoDB.DocumentClient();

exports.handler = function(event, context) {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    // Object to aggregate data
    var counters = {};

    // Iterate through Kinesis records
    event.Records.forEach(function(record) {
    // Kinesis data is base64 encoded so decode here
    payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
    movement = JSON.parse(payload);
    /*
        Each record contains a JSON structure with the following data:
        
        {
        "Username" : "username",
        "X" : 123,
        "Y" : 456,
        "Time" : 12345678
        }

    */

    username = movement.Username;
    round_time = Math.round(movement.Time / 1000);
    
    // Count number of movements per second
    if (!(username in counters)) {
        // initialize dict for each user
        console.log('Initializing user: ' + username);
        counters[username] = {};
    }

    if (!(round_time in counters[username])) {
        // initialize dict for each timestamp
        console.log('Initializing timestamp: ' + round_time);
        counters[username][round_time] = [];
    }

    // Add data to array holding movements for that second
    counters[username][round_time].push({"X": movement.X, "Y": movement.Y});
    });

    /*
     Starting persistance in DynamoDB:
        Loop through records to see if an item with the same combination
        of username-timestamp already exist. If the item exist, update it
        using 'list_append' function. If the item does not exist, create
        it. 
    */

    var keys = [];
    // Loop through users
    for (var user in counters) {
        // Loop through timestamp
        for (var timestamp in counters[user]) {
            key = {
                username:   user,
                timestamp:  Number(timestamp) 
            }
            keys.push(key)
    // DynamoDB parameters object
    var params = {};
    params.ConsistentRead = true;
    params.RequestItems = {
        'Tracking': {
            Keys: keys
        }
    };
    // Call DynamoDB
    docClient.batchGet(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
        } else {
            // Entry does not exist, so we need use PutItem
            console.log('Creating: ', user, timestamp);
            params = {};
            params.TableName = 'Tracking';
            params.Item = {
                username: user,
                timestamp: Number(timestamp),
                count: counters[user][timestamp].length,
                movs: counters[username][timestamp]
            };
            // if there is only one movement, and it is == to X:0, Y:0
            // fix: could receive more than one movement with X:0 and Y:0. If sum == 0, means there are no movements
            sum = 0;
            for (var key in counters[username][timestamp]) {
                sum += counters[username][timestamp][key].X + counters[username][timestamp][key].Y;
            }
            if (sum === 0) {
                params.Item.count = 0;
            }
            dynamo.putItem(params, function(err, data) {
                if (err) {
                console.log(err, err.stack);
                } else {
                console.log('putItem', data);
                }
                context.succeed('OK');
            });
            }
        }
        });
    }
    }
};