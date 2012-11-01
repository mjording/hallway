var taskStore = require('taskStore');
var assert = require('assert');

describe('taskStore', function() {
  describe('getTasks()', function() {
    it('should not crash', function(done){
      taskStore.getTasks('s611642@rdio', function(err, tasks) {
        done()
      });
    });
    it('should not allow an empty pid', function(done){
      taskStore.getTasks('', function(err, tasks) {
        assert(err);
        done()
      });
    });
    it('should not allow an invalid service', function(done){
      taskStore.getTasks('id@notaserviceevar', function(err, tasks) {
        assert(err);
        done()
      });
    });
  });
});

