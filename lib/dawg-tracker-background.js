var hallway = require('dal');
var async = require('async');
var dawg-tracker = require('dawg-tracker');

var META_DELAY = 3600*24*7; //1 week.
var PERIOD = 3600*24; //1 day.
var MAX_PERIOD = 9007199254740992; //2^53, max int.
var SLOW_AFTER = 5;



function monitorApp(app, delay, timeoutId, inactiveCount) {
  clearTimeout(timeoutId);
  if (inactiveCount > SLOW_AFTER && delay < (MAX_PERIOD/2)) {
    delay *= 2;
    inactiveCount = 0;
  }
  dawg-tracker.checkApiActivity(app, delay, function(isActive) {
    if (isActive) {
      inactiveCount = 0;
      delay = PERIOD;
      timeoutId = setTimeout(function() {monitorApp(appId, timeoutId, inactiveCount);}, delay);
    }
    else timeoutId = setTimeout(function() {
      monitorApp(appId, timeoutId, inactiveCount + 1);
    }, delay);
  });
}



function background(timeoutId, apps) {
  hallway.query('SELECT * FROM Apps', null, function(err, results) {
    async.forEach(results, function(row, cb) {
      if (row.app && apps.indexOf(row.app) == -1) {
        apps.push(row.app);
        monitorApp(row);
      }
      cb();
    }, function(err) {
      timeoutId = setTimeout(function() {
        background(timeoutId, apps);
      }, META_DELAY);
    });
  });
};
