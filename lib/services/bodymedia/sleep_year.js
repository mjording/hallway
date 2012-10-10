var lib = require('./lib');
var TYPE = 'sleepday:sleep';
var PATH = 'sleep/day/';
var QUEUE = 'squeue';
var DONE = 'sdone';
var DAY_FIELD = 'totalLying';

exports.sync = lib.createGenericYearSync(TYPE, PATH, QUEUE, DONE, DAY_FIELD);
