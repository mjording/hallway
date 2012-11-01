var assert = require('assert');

var servezas = require('servezas');

describe('servezas', function() {
  describe('load()', function() {
    it('should not crash', function(done){
      servezas.load(done);
    });
  });

  describe('syncletList()', function() {
    it('should return some synclets', function(done) {
      var fb = servezas.syncletList('facebook');
      assert(fb.length > 2);
      done();
    });
    it('shouldn\'t return global synclets', function(done) {
      servezas.serviceList().forEach(function(service) {
        var synclets = servezas.syncletList(service);
        for (var i in synclets) {
          assert(!servezas.syncletData(service, synclets[i]).global);
        }
      });
      done();
    });
  });

  describe('globalSyncletList()', function() {
    it('should return some synclets', function(done) {
      var li = servezas.globalSyncletList('linkedin');
      assert(li.length > 0);
      done();
    });
    it('should only return global synclets', function(done) {
      servezas.serviceList().forEach(function(service) {
        var synclets = servezas.globalSyncletList(service);
        for (var i in synclets) {
          assert(servezas.syncletData(service, synclets[i]).global);
        }
      });
      done();
    });
  });

  describe('allSyncletList()', function() {
    it('should return some synclets', function(done) {
      var li = servezas.allSyncletList('linkedin');
      assert(li.length > 0);
      done();
    });
    it('should return global and regular synclets', function(done) {
      var foundReg, foundGlobal;
      servezas.serviceList().forEach(function(service) {
        var synclets = servezas.allSyncletList(service);
        for (var i in synclets) {
          if (servezas.syncletData(service, synclets[i]).global) {
            foundGlobal = true;
          } else foundReg = true;
        }
      });
      assert(foundGlobal);
      assert(foundReg);
      done();
    });
  });

  describe('syncletData()', function() {
    it('should return some data', function(done) {
      var fb = servezas.syncletData('facebook', 'photos');
      assert.equal(fb.name, 'photos');
      done();
    });
  });

  describe('synclet()', function() {
    it('should return some data', function(done) {
      var fb = servezas.synclet('facebook', 'photos');
      assert.equal(typeof fb.sync, 'function');
      done();
    });
  });

  describe('synclets()', function() {
    it('should return some data', function(done) {
      var fb = servezas.synclets('facebook');
      assert.equal(fb.photos.data.name, 'photos');
      done();
    });
  });

  describe('services()', function() {
    it('should return some data', function(done) {
      var services = servezas.services();
      assert(Object.keys(services).length > 10);
      assert(services.facebook.synclets.length > 2);
      done();
    });
  });

  describe('serviceList()', function() {
    it('should return some data', function(done) {
      var services = servezas.serviceList();
      assert(services.length > 10);
      assert.notEqual(services.indexOf('facebook'), -1);
      done();
    });
  });
});

