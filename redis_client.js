/**
 * Simple wrapper/helpers for the Redis NPM client.  Server only.
 */

var RedisNpm = Npm.require('redis');
var UrlNpm = Npm.require('url');

RedisInternals.NpmModule = RedisNpm;

RedisClient = function (url, options) {
  var self = this;
  options = options || {};

  var parsedUrl = UrlNpm.parse(url);
  var host = parsedUrl.hostname || '127.0.0.1';
  var port = parseInt(parsedUrl.port || '6379');

  if (parsedUrl.auth) {
    var auth = parsedUrl.auth;
    var colon = auth.indexOf(':');
    // Note that redis doesn't use the username!
    options.auth_pass = auth.substring(colon + 1);
  }

  self._connection = RedisNpm.createClient(port, host, options);
};

RedisClient.prototype.subscribeKeyspaceEvents = function (callback, listener) {
  var self = this;

  self._connection.on("pmessage", function (pattern, channel, message) {
    var colonIndex = channel.indexOf(":");
    if (channel.indexOf("__keyspace@") != 0 || colonIndex == 0) {
      Meteor._debug("Unrecognized channel: " + channel);
      return;
    }
    var key = channel.substr(colonIndex+1);
    listener(key, message);
  });
  self._connection.psubscribe("__keyspace@*", callback);
};


RedisClient.prototype.publish = function (channel, message, callback) {
  var self = this;

  self._connection.publish(channel, message, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.findCandidateKeys = function (collectionName, matcher, callback) {
  var self = this;

  // Special case the single-document matcher
  // {"_paths":{"_id":true},"_hasGeoQuery":false,"_hasWhere":false,"_isSimple":true,"_selector":{"_id":"XhjyfgEbYyoYTiABX"}}
  var simpleKeys = null;
  if (!matcher._hasGeoQuery && !matcher._hasWhere && matcher._isSimple) {
    var keys = _.keys(matcher._selector);
    if (keys.length == 1 && keys[0] === "_id") {
      var selectorId = matcher._selector._id;
      if (typeof selectorId === 'string') {
        simpleKeys = [collectionName + "//" + selectorId];
      }
    }
  }

  if (simpleKeys === null) {
    self._connection.keys(collectionName + "//*", Meteor.bindEnvironment(callback));
  } else {
    callback(null, simpleKeys);
  }
};

RedisClient.prototype.keys = function (pattern, callback) {
  var self = this;

  self._connection.keys(pattern, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.flushall = function (callback) {
  var self = this;

  self._connection.flushall(Meteor.bindEnvironment(callback));
};

RedisClient.prototype.setex = function (key, expiration, value, callback) {
  var self = this;
  self._connection.setex(key, expiration, value, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.mget = function (keys, callback) {
  var self = this;

  if (!keys.length) {
    // mget is fussy about empty keys array
    callback(null, []);
    return;
  }

  // XXX Strip any null values from results?
  self._connection.mget(keys, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.matching = function (pattern, callback) {
  var self = this;

  self._connection.keys(pattern, Meteor.bindEnvironment(function (err, result) {
    if (err) {
      Meteor._debug("Error listing keys: " + err);
      callback(err, null);
    } else {
      self.mget(result, callback);
    }
  }));
};

_.each(REDIS_COMMANDS_HASH, function (method) {
  RedisClient.prototype[method] = function (/* arguments */) {
    var self = this;
    var args = _.toArray(arguments);
    var cb = args.pop();

    if (_.isFunction(cb)) {
      args.push(Meteor.bindEnvironment(function (err, result) {
        // Mongo returns undefined here, our Redis binding returns null
        // XXX remove this when we change our mind back to null.
        if (result === null) {
          result = undefined;
        }
        // sometimes the result is a vector of values (like multiple hmget)
        if (_.isArray(result)) {
          result = _.map(result, function (value) {
            return value === null ? undefined : value;
          });
        }
        cb(err, result);
      }));
    } else {
      args.push(cb);
    }

    var ret = self._connection[method].apply(self._connection, args);
    // Replace null with undefined as redis npm client likes to return null
    // when the value is absent. To be consistent with other behavior we
    // prefer undefined as absence of value.
    // XXX remove this when we change our mind back to null.
    return ret === null ? undefined : ret;
  };
});

// XXX: Remove (in favor of default implementation?)
RedisClient.prototype.hgetall = function (key, callback) {
  var self = this;

  self._connection.hgetall(key, Meteor.bindEnvironment(function (err, result) {
    // Mongo returns undefined here, our Redis binding returns null
    if (result === null) {
      result = undefined;
    }
    callback(err, result);
  }));
};

RedisClient.prototype.del = function (keys, callback) {
  var self = this;

  self._connection.del(keys, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.get = function (key, callback) {
  var self = this;

  self._connection.get(key, Meteor.bindEnvironment(function (err, res) {
    // Mongo returns undefined here, our Redis binding returns null
    if (res === null)
      res = undefined;
    callback(err, res);
  }));
};

RedisClient.prototype.set = function (key, value, callback) {
  var self = this;

  self._connection.set(key, value, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.getConfig = function (key, callback) {
  var self = this;

  self._connection.config('get', key, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.setConfig = function (key, value, callback) {
  var self = this;

  self._connection.config('set', key, value, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.incr = function (key, callback) {
  var self = this;

  self._connection.incr(key, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.incrby = function (key, delta, callback) {
  var self = this;

  self._connection.incrby(key, delta, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.incrbyfloat = function (key, delta, callback) {
  var self = this;

  self._connection.incrbyfloat(key, delta, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.decr = function (key, callback) {
  var self = this;

  self._connection.decr(key, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.decrby = function (key, delta, callback) {
  var self = this;

  self._connection.decrby(key, delta, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.append = function (key, suffix, callback) {
  var self = this;

  self._connection.append(key, suffix, Meteor.bindEnvironment(callback));
};

RedisClient.prototype.getAll = function (keys, callback) {
  var self = this;

  var connection = self._connection;

  var errors = [];
  var values = [];
  var replyCount = 0;

  var n = keys.length;

  if (n == 0) {
    callback(errors, values);
    return;
  }

  _.each(_.range(n), function(i) {
    var key = keys[i];
    connection.get(key, Meteor.bindEnvironment(function(err, value) {
      if (err) {
        Meteor._debug("Error getting key from redis: " + err);
      }
      errors[i] = err;
      values[i] = value;

      replyCount++;
      if (replyCount == n) {
        callback(errors, values);
      }
    }));
  });
};

RedisClient.prototype.setAll = function (keys, values, callback) {
  var self = this;

  var connection = self._connection;

  var errors = [];
  var results = [];

  var n = keys.length;
  if (n == 0) {
    callback(errors, results);
    return;
  }

  var replyCount = 0;
  _.each(_.range(n), function(i) {
    var key = keys[i];
    var value = values[i];

    connection.set(key, value, Meteor.bindEnvironment(function(err, result) {
      if (err) {
        Meteor._debug("Error setting value in redis: " + err);
      }
      errors[i] = err;
      results[i] = result;

      replyCount++;
      if (replyCount == n) {
        callback(errors, results);
      }
    }));
  });
};


RedisClient.prototype.removeAll = function (keys, callback) {
  var self = this;

  var connection = self._connection;

  var errors = [];
  var results = [];

  var n = keys.length;
  if (n == 0) {
    callback(errors, results);
    return;
  }

  var replyCount = 0;
  _.each(_.range(n), function(i) {
    var key = keys[i];
    connection.del(key, Meteor.bindEnvironment(function(err, result) {
      if (err) {
        Meteor._debug("Error deleting key in redis: " + err);
      }
      errors[i] = err;
      results[i] = result;

      replyCount++;
      if (replyCount == n) {
        callback(errors, results);
      }
    }));
  });
};


