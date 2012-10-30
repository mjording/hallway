/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var path = require('path');
var lib = require('./lib');

// get all the data we can!
var EXTRAS = 'description,license,date_upload,date_taken,owner_name,'+
             'icon_server,original_format,last_update,geo,tags,machine_tags,'+
             'o_dims,views,media,path_alias,url_sq,url_t,url_s,url_q,url_m,'+
             'url_n,url_z,url_c,url_l,url_o';

var ARGS = {
  user_id: 'me',
  extras: EXTRAS
};
var PER_PAGE = 500;
exports.sync = function(pi, callback) {
  lib.getPage(pi, 'flickr.people.getPhotos', 'photo', PER_PAGE, ARGS,
    function(err, config, photosArray) {
    if (err) {
      return callback(err);
    }
    var data = {};
    data['photo:'+pi.auth.pid+'/photos'] = photosArray;
    callback(null, {config:config, data:data});
  });
}
