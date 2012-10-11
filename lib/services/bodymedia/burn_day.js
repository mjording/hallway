var TYPE = 'minutes:burn_minutes';
var PATH = 'burn/day/minute/intensity/';
var QUEUE = 'queue';
var DONE = 'done';

exports.sync = require('./lib').createGenericDaySync(TYPE, PATH, QUEUE, DONE);
