// we don't do anything since it's done in auth.js
exports.sync = function(pi, cb) {
  cb(null, {auth:pi.auth, data:pi.auth.profile});
};
