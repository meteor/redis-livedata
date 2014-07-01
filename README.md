# Redis Livedata

`redis-livedata` is a Meteor unipackage available on
[Atmosphere](https://atmospherejs.com/package/redis-livedata).

The goal of this package is to bring a full-stack reactivity support for Redis
in Meteor applications. This includes data-sync, latency compensation combined
with Meteor's plug'n'play packaging interface, ease of use and flexible
permissions system.


## Installation

Add this package to your Meteor app with meteorite:

    mrt add redis-livedata

Since Redis is not shipped with Meteor or this package yet you would need to
have a running server and a url to connect to it. You can install Redis locally
on Mac OS X with homebrew `brew install redis` or by following the
[instructions](http://redis.io/download) for other platforms. The latest tested
and officially supported version of Redis is 2.8.9.

To connect to the particular Redis server, pass its url as the `REDIS_URL`
environment variable to the Meteor server process. It is set to `localhost`.

   env REDIS_URL=123.0.123.0 meteor

This package relies on key-space notification system on your Redis server, so
either set it up from redis-cli:

    CONFIG SET notify-keyspace-events AKE

or set the `REDIS_CONFIGURE_KEYSPACE_NOTIFICATIONS=1` environment variable for
your Meteor application server process and Meteor will set this command for you:

    env REDIS_CONFIGURE_KEYSPACE_NOTIFICATIONS=1 REDIS_URL=123.0.123.0 meteor


## RedisCollection

You can instantiate the Redis collection either on client or on the server. The
collection can be either unnamed (unmanaged, just in-memory) or called "redis"
as Redis doesn't have any concept of namespaced collections.

    R = new Meteor.RedisCollection("redis");

The collection wraps the Redis commands and makes them "synchronous" (just
looking synchronous, but still not blocking the event-loop) if no callback is
passed or node-style async if one is passed.

## Publish/Subscribe

One can publish a cursor just like in mongo-livedata:

    Meteor.publish("peter-things", function () {
      return R.matching("peter-things-*");
    });

This way data will be automatically synchronized to all subscribed clients.

## Latency compensation

Latency compensation works with all supported commands used either at the
client or client's simulations.

## Permissions: allow/deny

Unlike mongo-livedata there is only one type of allow/deny callbacks: `exec`.

    // allow only 'incr' calls on keys starting with 'peter-things-'
    R.allow({
      exec: function (userId, command, args) {
        if (command !== 'incr') return false;
        if (_.any(args, function (key) { return key.substr(0, 13) !== "peter-things-"; }))
          return false;
        return true;
      }
    });

## Supported commands

Right now only commands related to keys and strings are supported (but not
binary operations). Sets, hashes, ordered sets and other are not supported.


# License

MIT (c) Meteor Development Group

