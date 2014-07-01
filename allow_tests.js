if (Meteor.isClient) {
  Tinytest.addAsync("allow/deny - allow all", function (test, onComplete) {
    var runId = test.runId();
    var C = new Meteor.RedisCollection("redis");
    Meteor.call("prefixRedisCollection", runId, { insecure: true }, function (err, res) {
      test.isFalse(err);
      Meteor.subscribe("c-" + runId, function () {
        C.set(runId + ":allowedVal", "foo", function (err, res) {
          test.isFalse(err);
          onComplete();
        });
      });
    });
  });

  Tinytest.addAsync("allow/deny - allow some", function (test, onComplete) {
    var runId = test.runId();
    var C = new Meteor.RedisCollection("redis");
    Meteor.call("prefixRedisCollection", runId, function (err, res) {
      test.isFalse(err);
      Meteor.call("addAllowRule", runId, "return command === 'set'");
      Meteor.subscribe("c-" + runId, function () {
        C.set(runId + ":allowedVal", "foo", function (err, res) {
          test.isFalse(err);
          C.del(runId + ":allowedVal", function (err, res) {
            test.equal(err.error, 403);
            test.equal(C.get(runId + ":allowedVal"), "foo");
            onComplete();
          });
        });
      });
    });
  });

  Tinytest.addAsync("allow/deny - deny only (deny nothing)", function (test, onComplete) {
    var runId = test.runId();
    var C = new Meteor.RedisCollection("redis");
    Meteor.call("prefixRedisCollection", runId, function (err, res) {
      test.isFalse(err);
      Meteor.call("addDenyRule", runId, "return false");
      Meteor.subscribe("c-" + runId, function () {
        C.set(runId + ":disallowed", "foo", function (err, res) {
          test.equal(err.error, 403);
          C.del(runId + ":dissallowed", function (err, res) {
            test.equal(err.error, 403);
            onComplete();
          });
        });
      });
    });
  });

  Tinytest.addAsync("allow/deny - deny some", function (test, onComplete) {
    var runId = test.runId();
    var C = new Meteor.RedisCollection("redis");
    Meteor.call("prefixRedisCollection", runId, function (err, res) {
      test.isFalse(err);
      Meteor.call("addDenyRule", runId, "return parseInt(args[1], 10) % 2 === 1");
      Meteor.call("addDenyRule", runId, "return parseInt(args[1], 10) % 5 === 2");
      Meteor.call("addAllowRule", runId, "return true"); // allow everything
      Meteor.subscribe("c-" + runId, function () {
        C.set(runId + ":allowedVal", "10", function (err, res) {
          test.isFalse(err);
          C.set(runId + ":notAllowed", "11", function (err, res) {
            test.equal(err.error, 403);
            C.set(runId + ":notAllowed", "17", function (err, res) {
              test.equal(err.error, 403);
              onComplete();
            });
          });
        });
      });
    });
  });

  Tinytest.addAsync("allow/deny - deny some + deny all", function (test, onComplete) {
    var runId = test.runId();
    var C = new Meteor.RedisCollection("redis");
    Meteor.call("prefixRedisCollection", runId, function (err, res) {
      test.isFalse(err);
      Meteor.call("addDenyRule", runId, "return parseInt(args[1], 10) % 2 === 1");
      Meteor.call("addDenyRule", runId, "return parseInt(args[1], 10) % 5 === 2");
      Meteor.call("addDenyRule", runId, "return true");
      Meteor.call("addAllowRule", runId, "return true"); // allow everything
      Meteor.subscribe("c-" + runId, function () {
        C.set(runId + ":notAllowed", "10", function (err, res) {
          test.equal(err.error, 403);
          C.set(runId + ":notAllowed", "11", function (err, res) {
            test.equal(err.error, 403);
            C.set(runId + ":notAllowed", "17", function (err, res) {
              test.equal(err.error, 403);
              onComplete();
            });
          });
        });
      });
    });
  });

  Tinytest.addAsync("allow/deny - allow + deny", function (test, onComplete) {
    var runId = test.runId();
    var C = new Meteor.RedisCollection("redis");
    Meteor.call("prefixRedisCollection", runId, function (err, res) {
      test.isFalse(err);
      Meteor.call("addDenyRule", runId, "return parseInt(args[1], 10) % 2 === 1");
      Meteor.call("addDenyRule", runId, "return parseInt(args[1], 10) % 5 === 2");
      Meteor.call("addAllowRule", runId, "return parseInt(args[1], 10) > 10");
      Meteor.subscribe("c-" + runId, function () {
        C.set(runId + ":notAllowed", "10", function (err, res) {
          test.equal(err.error, 403);
          C.set(runId + ":notAllowed", "11", function (err, res) {
            test.equal(err.error, 403);
            C.set(runId + ":notAllowed", "17", function (err, res) {
              test.equal(err.error, 403);
              C.set(runId + ":shouldWork", "18", function (err, res) {
                test.isFalse(err);
                test.equal(C.get(runId + ":shouldWork"), "18");
                onComplete();
              });
            });
          });
        });
      });
    });
  });
}  // end if isClient



// A few simple server-only tests which don't need to coordinate collections
// with the client..
if (Meteor.isServer) {
  Tinytest.add("collection - allow and deny validate options", function (test) {
    var collection = new Meteor.RedisCollection(null);

    test.throws(function () {
      collection.allow({invalidOption: true});
    });
    test.throws(function () {
      collection.deny({invalidOption: true});
    });
    test.throws(function () {
      collection.deny({insert: true});
    });
    test.throws(function () {
      collection.deny({update: true});
    });
    test.throws(function () {
      collection.deny({remove: true});
    });

    _.each(['exec'], function (key) {
      var options = {};
      options[key] = true;
      test.throws(function () {
        collection.allow(options);
      });
      test.throws(function () {
        collection.deny(options);
      });
    });

    _.each(['exec'], function (key) {
      var options = {};
      options[key] = ['an array']; // this should be a function, not an array
      test.throws(function () {
        collection.allow(options);
      });
      test.throws(function () {
        collection.deny(options);
      });
    });
  });

  Tinytest.add("collection - calling allow restricts", function (test) {
    var collection = new Meteor.RedisCollection(null);
    test.equal(collection._restricted, false);
    collection.allow({
      exec: function() {}
    });
    test.equal(collection._restricted, true);
  });

  Tinytest.add("collection - global insecure", function (test) {
    // note: This test alters the global insecure status, by sneakily hacking
    // the global Package object!
    var insecurePackage = Package.insecure;

    Package.insecure = {};
    var collection = new Meteor.RedisCollection(null);
    test.equal(collection._isInsecure(), true);

    Package.insecure = undefined;
    test.equal(collection._isInsecure(), false);

    delete Package.insecure;
    test.equal(collection._isInsecure(), false);

    collection._insecure = true;
    test.equal(collection._isInsecure(), true);

    if (insecurePackage)
      Package.insecure = insecurePackage;
    else
      delete Package.insecure;
  });
}
