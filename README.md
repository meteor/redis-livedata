# Redis Livedata
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/meteor/redis-livedata?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

`redis-livedata` is a Meteor unipackage available on
[Atmosphere](https://atmospherejs.com/package/redis-livedata).

The goal of this package is to bring full-stack reactivity support for Redis
in Meteor applications. This includes data-sync and latency-compensation, combined
with Meteor's plug'n'play packaging interface, ease of use and flexible
permissions system.


## Installation

Add this package to your Meteor app:

    meteor add slava:redis-livedata

Since Redis is not yet shipped with Meteor or this package, you need to
have a running Redis server and a url to connect to it. You can install Redis locally
on Mac OS X with homebrew `brew install redis` or by following the
[instructions](http://redis.io/download) for other platforms. The latest tested
and officially supported version of Redis is 2.8.9.

To configure the Redis server connection information, pass its url as the `REDIS_URL`
environment variable to the Meteor server process. It defaults to `localhost:6379`.

    env REDIS_URL=redis://username:password@1.2.3.4:6379 meteor

To provide reactivity, this package uses [Redis Keyspace Notifications](http://redis.io/topics/notifications).  You
need to enable keyspace notifications; you should do this either from redis-cli:

    CONFIG SET notify-keyspace-events AKE

or set the `REDIS_CONFIGURE_KEYSPACE_NOTIFICATIONS=1` environment variable for
your Meteor application server process, and the package will then configure this for you:

    env REDIS_CONFIGURE_KEYSPACE_NOTIFICATIONS=1 REDIS_URL=... meteor

## RedisCollection

Just like Meteor.Collection with Mongo, you will work with Meteor.RedisCollection for
Redis data.

You can instantiate a RedisCollection on both client and on the server.  The
collection can be either unnamed (unmanaged, just in-memory) or must be "redis"
as Redis doesn't have any concept of namespaced collections.

```javascript
var redisCollection = new Meteor.RedisCollection("redis");
```

The collection wraps the Redis commands.  If a callback is passed then the
commands execute asynchronously.  If no callback is passed, on the server,
the call is executed synchronously (technically this uses fibers and only
appears to be synchronous, so it does not block the event-loop).  If
you're on the client and don't pass a callback, the call executes asynchronously
and you won't be notified of the result.

## Publish/Subscribe

One can publish a cursor just like in mongo-livedata.  The Redis equivalent of 'find' is 'matching', which
matches keys using [Redis pattern matching syntax](http://redis.io/commands/keys).

```javascript
Meteor.publish("peter-things", function () {
  return redisCollection.matching("peter-things-*");
});
```

This way data will be automatically synchronized to all subscribed clients.

## Latency compensation

Latency compensation works with all supported commands used either at the
client or client's simulations.

## Permissions: allow/deny

Because redis has so many commands, unlike mongo-livedata all commands go
through one allow/deny callback method: `exec`.

```javascript
// allow only 'incr' calls on keys starting with 'peter-things-'
redisCollection.allow({
  exec: function (userId, command, args) {
    if (command !== 'incr') return false;
    if (_.any(args, function (key) { return key.substr(0, 13) !== "peter-things-"; }))
      return false;
    return true;
  }
});
```

## Supported commands

Right now only commands related to keys and strings are supported (but not
binary operations) and Hashes. Sets, ordered sets and other are not currently
supported.

Flushall does not currently work, because Redis doesn't send a keyspace notification.

## Known Issues

Right now it is known that the following things don't work:

- publishing an array of cursors (create several separate publishes instead)
- flushall is not noticed
- no support for sets, ordered sets, lists, hyperloglog, etc

# License

MIT (c) Meteor Development Group

