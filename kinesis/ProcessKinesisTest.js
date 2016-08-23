console.log('Loading function');

exports.handler = function(event, context) {
  //console.log('Received event:', JSON.stringify(event, null, 2));
  // Create Object to hold counters
  var counters = {};
  event.Records.forEach(function(record) {
    // Kinesis data is base64 encoded so decode here
    payload = new Buffer(record.kinesis.data, 'base64').toString('ascii');
    // Data inside Kinesis
    position = JSON.parse(payload);
    username = position.Username;
    round_time = Math.round(position.Time / 1000);
    // Count number of events per second
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
    // Add position to array holding movements for that second
    counters[username][round_time].push({"X": position.X, "Y": position.Y});
  });
  /*
   Starting persistance in DynamoDB
  */
  // Loop through users
  for (var user in counters) {
    // Loop through timestamp
    for (var timestamp in counters[user]) {
      // Check if entry for user-timestamp already exists on DynamoDB
      params = {};
      params.TableName = "Tracking";
      params.Key = {
        username: user,
        timestamp: Number(timestamp)
      };
      params.ConsistentRead = true;
      console.log('Getting item with params', JSON.stringify(params));
      // Call DynamoDB
      dynamo.getItem(params, function(err, data) {
        if (err) {
          console.log(err, err.stack);
        } else {
          if (Object.keys(data).length !== 0) {
            // Entry exists, so we need to use expressions for UpdateItem
            console.log('Updating: ', user, timestamp);
            params = {};
            params.TableName = 'Tracking';
            params.Key = {
              username: user,
              timestamp: Number(timestamp)
            };
            params.UpdateExpression = "ADD #c :val1 SET movs = list_append(movs, :val2)";
            // count is a reserved word in DynamoDB
            params.ExpressionAttributeNames = {"#c" : "count"};
            params.ExpressionAttributeValues = {
              ":val1" : counters[user][timestamp].length,
              ":val2" : counters[user][timestamp]
            };
            dynamo.updateItem(params, function(err, data) {
              if (err) {
                console.log(err, err.stack);
              } else {
                console.log(data);
              }
              context.succeed('OK');
            });
          }
          else {
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