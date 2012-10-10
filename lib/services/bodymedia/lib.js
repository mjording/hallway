var OAlib = require('oauth').OAuth;
var API_PATH = 'https://api.bodymedia.com/oauth/access_token?api_key=';

exports.genericSync = function(type, pather, arrayer) {
  return function f(pi, cb, flag) {
    var path = pather(pi);
    if(!path) return cb(null, {data:{}}); // nothing to do
    var url = 'http://api.bodymedia.com/v2/json/'+path+'?api_key='+pi.auth.consumerKey;
    var OA = new OAlib(null,
        API_PATH + pi.auth.consumerKey,
        pi.auth.consumerKey,
        pi.auth.consumerSecret,
        '1.0', null, 'HMAC-SHA1', null,
        {'Accept': '*/*', 'Connection': 'close'});
    OA.get(url, pi.auth.token, pi.auth.tokenSecret, function(err, body){
      if(err && err.statusCode == 401 && !flag) return refreshToken(OA, f, pi, cb);
      if(err && err.statusCode == 403 && !flag) {
        // default noncom is enforced at 2/sec
        // (https://developer.bodymedia.com/forum/read/156586)
        // one chance to wait just a bit and try again for lack of better way
        // of doing this
        return setTimeout(function(){
            f(pi, cb, true)
          }, Math.random()*20000);       }
      try{ var js = JSON.parse(body); }catch(E){ return cb(err); }
      var data = {};
      var parts = type.split(':');
      data[parts[0]+':'+pi.auth.pid+'/'+parts[1]] = arrayer(pi, js);
      cb(err, {config:pi.config, data: data, auth:pi.auth});
    });
  };
};

function refreshToken(oauth, f, pi, cb) {
  oauth.getOAuthAccessToken(pi.auth.token, pi.auth.tokenSecret,
    function (error, oauth_token, oauth_token_secret, additionalParameters) {
    if (error || !oauth_token) return cb("oauth failed to refresh expired token: "+error);
    pi.auth.token = oauth_token;
    pi.auth.tokenSecret = oauth_token_secret;
    f(pi, cb, true);
  });
}

exports.formatDate = function(d) {
  var yr = d.getFullYear();
  var mo = (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1);
  var da = (d.getDate() < 10 ? '0' : '') + d.getDate();
  return "" + yr + mo + da;
}
