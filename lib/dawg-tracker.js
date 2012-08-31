/* This module handles all the processing for customer state tracking */

var hallmonitor = require('dal');

var ACTIVITY_LAG = 7 * 24 * 3600;

//Create unique index app_state on activity_states (app_id,state);

exports.logActivity = function(data) {
  //write it into HM DB
  data.when = data.when || 'UNIX_TIMESTAMP()';
  var query = ['INSERT INTO activity_states',
               '(app_id,state,first_activity,last_activity)',
               'VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE',
               'last_activity=?'].join(' ');
  var values = [data.app_id,
                data.state,
                data.when,
                data.when,
                data.when];
  var hallmonitor.query(query, values, function(err) {
    if (err) console.log(err);
  });
}

exports.checkApiActivity = function() {
  //Check for most recent api call
};

exports.ifInactive = function(app_id, action) {
  var latest = 0;
  var query = 'SELECT last_activity FROM activity_states WHERE app_id = ?';
  hallmonitor.query(query, app_id, function(err, results) {
    if (err) return console.log(err);
    async.forEach(results,
      function (row, cb) {
        if (row.last_activity > latest) latest = row.last_activity;
      },
      function (err) {
        var now = Math.round(Date.now()/1000);
        if (latest < now - ACTIVITY_LAG) action(app_id);
    });
  });
};

exports.ifBlocked = function(app_id, action) {
  var query = 'SELECT * FROM activity_states WHERE app_id = ?';
  hallmonitor.query(query, app_id, function(err, results) {
    if (err) return console.log(err);
    results.forEach(function(row) {
      if (row.last_activity - row.first_activity) action(app_id, row);
    });
  });
};
