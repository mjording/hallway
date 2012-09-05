/* This module handles all the processing for customer state tracking */

var LOCAL_DEV_STATE = 3;
var LIVE_DEV_STATE = 4;

var hallmonitor = require('dal');
var ijod = require('ijod');

var ACTIVITY_LAG = 7 * 24 * 3600;

//Create unique index app_state on activity_states (app_id,state);
var logActivity = exports.logActivity = function(data) {
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

/* Check for an api call in the last <period> seconds and 
   set state iff there has been an api call, otherwise do nothing.
   Differentiate state based on local or non-local callback url */
exports.checkApiActivity = function(app, period, callback) {
  var options = {
    since: Date.now() - (period * 1000)
  };
  var logs = [];
  ijod.getBounds('logs:' + app.app + '/anubis', options, function(err, bounds) {
    if (err) console.log(err);
    if (!bounds || !bounds.total) callback(false);
    else if (bounds.total == 0) callback(false);
    else logDevState(app, callback);
  });
};

var logDevState = function(app, callback) {
  var cbUrl = JSON.parse(app.notes).callbackUrl;
  var state;
  if (cbUrl.indexOf('lvh.me') == -1 
      && cbUrl.indexOf('127.0.0.1') == -1
      && cbUrl.indexOf('localhost') == -1) state = LIVE_DEV_STATE;
  else state = LOCAL_DEV_STATE;
  logActivity({ when: Math.round(Date.now()/1000),
                state: LOCAL_DEV_STATE,
                app_id: app.app});
  callback(true);
});

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
