var lib = require('./lib');
var TYPE = 'intensity:burn_intensity';
var PATH = 'burn/day/intensity';
var QUEUE = 'queue';
var DONE = 'done';
var DAY_FIELD = 'totalCalories';

exports.sync = lib.createGenericYearSync(TYPE, PATH, QUEUE, DONE, DAY_FIELD);
