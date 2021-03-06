/*
 *
 * Copyright (C) 2011, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */

exports.alive = false;

var async = require('async');
var util = require('util');
var argv = require('optimist').argv;

// lconfig has to be loaded before any other hallway modules!
var lconfig = require('lconfig');

var instruments = require('instruments');
var logger = require('logger').logger('hallwayd');

logger.info('process id:' + process.pid);

var alerting = require("alerting");

function exit(returnCode) {
  logger.info("Shutdown complete");

  process.exit(returnCode);
}

var shuttingDown_ = false;

// scheduling and misc things
function shutdown(returnCode, callback) {
  if (shuttingDown_ && returnCode !== 0) {
    try {
      console.error("Aieee! Shutdown called while already shutting down! " +
        "Panicking!");
    }
    catch (e) {
      // we tried...
    }

    process.exit(1);
  }

  shuttingDown_ = true;
  process.stdout.write("\n");
  logger.info('Shutting down...');

  if (callback) {
    return callback(returnCode);
  }

  exit(returnCode);
}

if (lconfig.alerting && lconfig.alerting.key) {
  alerting.init(lconfig.alerting);

  alerting.install(function (E) {
    logger.warn('Uncaught exception: %s', E.message);
    logger.error(E);
    shutdown(1);
  });
}

var taskman = require('taskman');
var profileManager = require('profileManager');

var http = require('http');

// Set our globalAgent sockets higher
http.globalAgent.maxSockets = 800;

function startAPIHost(cbDone) {
  logger.info("Starting an API host");

  var webservice = require('webservice');

  webservice.startService(lconfig.lockerPort, lconfig.lockerListenIP,
    function (hallway) {
    logger.info('Hallway is now listening at ' + lconfig.lockerBase);

    cbDone();
  });
}

function startDawg(cbDone) {
  if (!lconfig.dawg || !lconfig.dawg.port || !lconfig.dawg.password) {
    logger.error("You must specify a dawg section with at least a port and " +
      "password to run.");

    shutdown(1);
  }

  logger.info("Starting a Hallway Dawg -- Think you can get away without " +
    "having a hall pass?  Think again.");

  var dawg = require('dawg');

  dawg.startService(lconfig.dawg.port, lconfig.dawg.listenIP, function() {
    logger.info("The Dawg is now monitoring at port %d", lconfig.dawg.port);

    cbDone();
  });
}

function startStream(cbDone) {
  logger.info("Starting a Hallway Stream -- you're in for a good time.");

  require('streamer').startService(lconfig.stream, function() {
    logger.info("Streaming at port %d", lconfig.stream.port);

    cbDone();
  });
}

function startWorkerWS(cbDone) {
  if (!lconfig.worker || !lconfig.worker.port) {
    logger.error("You must specify a worker section with at least a port and " +
      "password to run.");
    shutdown(1);
  }
  var worker = require("worker");
  if (!lconfig.worker.listenIP) lconfig.worker.listenIP = "0.0.0.0";
  worker.startService(lconfig.worker.port, lconfig.worker.listenIP, function() {
    logger.info("Starting a Hallway Worker, thou shalt be digitized",
      lconfig.worker);
    cbDone();
  });
}

var Roles = {
  worker: {
    startup: startWorkerWS
  },
  apihost: {
    startup: startAPIHost
  },
  dawg: {
    startup: startDawg
  },
  stream: {
    startup: startStream
  }
};

var role = Roles.apihost;

function startTaskman(cbDone) {
  var isWorker = (role === Roles.worker);
  if (isWorker) logger.info("Starting a worker.");
  taskman.init(argv.pid, isWorker, argv.once, cbDone);
}

if (argv._.length > 0) {
  if (!Roles.hasOwnProperty(argv._[0])) {
    logger.error("The %s role is unknown.", argv._[0]);

    return shutdown(1);
  }

  role = Roles[argv._[0]];
}

var startupTasks = [];

if (role !== Roles.stream) {
  // this loads all lib/services/*/map.js
  startupTasks.push(require('dMap').startup);
  startupTasks.push(require('ijod').initDB);
  startupTasks.push(startTaskman);
}

if (role !== Roles.dawg && role !== Roles.stream) {
  startupTasks.push(require('acl').init);
  startupTasks.push(profileManager.init);
}

if (role.startup) {
  startupTasks.push(role.startup);
}

async.series(startupTasks, function(error) {
  // TODO:  This needs a cleanup, it's too async
  logger.info("Hallway is up and running.");

  exports.alive = true;
});

process.on("SIGINT", function() {
  logger.info("Shutting down via SIGINT...");

  switch (role) {
    case Roles.worker:
      taskman.stop(function() {
        shutdown(0);
      });
      break;
    case Roles.apihost:
      shutdown(0);
      break;
    default:
      shutdown(0);
      break;
  }
});

process.on("SIGTERM", function () {
  logger.info("Shutting down via SIGTERM...");
  shutdown(0);
});

if (!process.env.LOCKER_TEST) {
  process.on('uncaughtException', function (err) {
    try {
      // copy of these in alerting.js so they don't fire alerts too
      var E = err;

      if (E.toString().indexOf('Error: Parse Error') >= 0) {
        // ignoring this for now, relating to some node bug,
        // https://github.com/joyent/node/issues/2997
        logger.warn("ignored exception", E);
        instruments.increment('exceptions.ignored').send();
        return;
      }

      if (E.toString().indexOf('ECONNRESET') >= 0 ||
        E.toString().indexOf('socket hang up') >= 0) {
        // THEORY: these bubble up from event emitter as uncaught errors, even
        // though the socket end event still fires and are ignorable
        logger.warn("ignored exception", E);
        instruments.increment('exceptions.ignored').send();
        return;
      }

      if (E.toString().indexOf('ETIMEDOUT') >= 0) {
        // THEORY: these bubble up from event emitter as uncaught errors, even
        // though the socket end event still fires and are ignorable
        logger.warn("ignored exception", E);
        instruments.increment('exceptions.ignored').send();
        return;
      }

      if (E.toString().indexOf('EADDRINFO') >= 0) {
        logger.warn("ignored exception", E);
        instruments.increment('exceptions.ignored').send();
        return;
      }

      logger.error('Uncaught exception:');
      logger.error(util.inspect(err));

      instruments.increment('exceptions.uncaught').send();

      if (err && err.stack) {
        logger.error(util.inspect(err.stack));
      }

      shutdown(1);
    } catch (e) {
      try {
        console.error("Caught an exception while handling an uncaught " +
          "exception!");
        console.error(e);
      } catch (e) {
        // we tried...
      }

      process.exit(1);
    }
  });
}

// Export some things so this can be used by other processes,
// mainly for the test runner
exports.shutdown = shutdown;
