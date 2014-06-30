if (Meteor.isServer) {
  var path = Npm.require('path');
  var Future = Npm.require(path.join('fibers', 'future'));
}

_SynchronousMapEntry = function () {
  var self = this;
  
  self._future = undefined;
  self._value = undefined;
  self._done = false;
};

SynchronousMap = function () {
  var self = this;
  
  self._map = {};
};

_.extend(SynchronousMap.prototype, {
  get: function (arguments, f) {
    var self = this;
    var v = self._map[arguments];
    if (v === undefined) {
      self._map[arguments] = v = new _SynchronousMapEntry;
    }
    if (v._done) {
      return v._value;
    }
    if (Meteor.isServer) {
      if (v._future) {
        return v._future.wait();
      }
      var future = v._future = new Future();
      try {
        var value = f.apply(null, arguments);
        v._future.return(value);
        v._value = value;
        v._done = true;
      } catch (e) {
        v._future.throw(e);
      // We'll retry this, so we won't set _done
      }
      v._future = null;
      return future.wait();
    } else {
      v._value = f.apply(null, arguments);
      v._done = true;
      return v._value;
    }
  }
});
