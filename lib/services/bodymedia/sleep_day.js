var TYPE = 'sleepday:sleep';
var PATH = 'sleep/day/period/';
var QUEUE = 'squeue';
var DONE = 'sdone';

exports.sync = require('./lib').createGenericDaySync(TYPE, PATH, QUEUE, DONE);
