var OAlib = require('oauth').OAuth;
var API_PATH = 'https://api.bodymedia.com/oauth/access_token?api_key=';

exports.genericSync = function(type, pather, arrayer) {
  return function f(pi, cb, refreshed, triedAagain) {
    var path = pather(pi);
    if(!path) return cb(null, {data:{}}); // nothing to do
    var url = 'http://api.bodymedia.com/v2/json/'+path+'?api_key='+pi.auth.consumerKey;
    var OA = new OAlib(null,
        API_PATH + pi.auth.consumerKey,
        pi.auth.consumerKey,
        pi.auth.consumerSecret,
        '1.0', null, 'HMAC-SHA1', null,
        {'Accept': '*/*', 'Connection': 'close'});
    OA.get(url, pi.auth.token, pi.auth.tokenSecret, function(err, body) {
      // first 401 is a refresh, second is an auth fail
      if(err && err.statusCode == 401 && !refreshed) {
        return refreshToken(OA, f, triedAagain, pi, cb);
      }
      // default noncom is enforced at 2/sec
      // (https://developer.bodymedia.com/forum/read/156586)
      // one chance to wait just a bit and try again for lack of better way
      // of doing this
      if(err && err.statusCode == 403 && !triedAagain) {
        return setTimeout(function(){
            f(pi, cb, refreshed, true)
          }, Math.random()*20000);
      }
      try{ var js = JSON.parse(body); }catch(E){ return cb(err); }
      var data = {};
      var parts = type.split(':');
      var update = arrayer(pi, js);
      data[parts[0]+':'+pi.auth.pid+'/'+parts[1]] = update.data;
      var ret = {};
      if (update.configUpdate) ret.config = update.configUpdate;
      if (update.data) ret.data = data;
      if (flag === 'refreshed')
      cb(err, {config:update.configUpdate, data: data, auth:pi.auth});
    });
  };
};

exports.createGenericYearSync = function(TYPE, PATH, QUEUE, DONE, DAY_FIELD) {
  return exports.genericSync(TYPE ,function(pi) {
    // calculate date range for the past year
    var first = new Date(Date.now()-(3600*1000*24*365));
    var second = new Date();
    return PATH + exports.formatDate(first) + '/' + exports.formatDate(second);
  }, function(pi, js) {
    if(!js || !js.days) return {};
    var configUpdate = {};
    configUpdate[QUEUE] = pi.config[QUEUE] || [];
    configUpdate[DONE] = pi.config[DONE] || {};
    // any days that have lying down we push into a queue for the sleep_day
    // synclet (unless they're flagged as done already)
    js.days.forEach(function(day) {
      if(day[DAY_FIELD] > 0 && !configUpdate[DONE][day.date]) {
        configUpdate[QUEUE].push(day.date);
      }
    });
    return {data: js.days, configUpdate: configUpdate};
  });
}

exports.createGenericDaySync = function(TYPE, PATH, QUEUE, DONE) {
  return exports.genericSync(TYPE, function(pi) {
    if(!pi.config || !pi.config[QUEUE] || pi.config[QUEUE].length == 0) return null;
    return PATH + pi.config[QUEUE][0];
  }, function(pi, js) {
    if(!js || !js.days) return {};
    var configUpdate = {};
    var done = configUpdate[DONE] = pi.config[DONE] || {};
    var queue = configUpdate[QUEUE] = pi.config[QUEUE];
    done[queue.shift()] = true; // same date from queue as above
    if(queue.length > 0) configUpdate.nextRun = -1;
    return {data: js.days, configUpdate: configUpdate};
  });
}

function refreshToken(oauth, f, triedAagain, pi, cb) {
  oauth.getOAuthAccessToken(pi.auth.token, pi.auth.tokenSecret,
    function (error, oauth_token, oauth_token_secret, additionalParameters) {
    if (error || !oauth_token) return cb("oauth failed to refresh expired token: "+error);
    pi.auth.token = oauth_token;
    pi.auth.tokenSecret = oauth_token_secret;
    f(pi, cb, true, triedAagain);
  });
}

exports.formatDate = function(d) {
  var yr = d.getFullYear();
  var mo = (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1);
  var da = (d.getDate() < 10 ? '0' : '') + d.getDate();
  return "" + yr + mo + da;
}
