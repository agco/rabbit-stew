# Rabbit-Stew

A Generic Event Consumer for RabbitMQ.


## Usage

Where to get it and what to put into `package.json`.

    "dependencies": {
        "rabbit-stew": "git+https://github.com/agco/rabbit-stew.git#master",
        ...
    }

Rabbit-Stew will also require instances of `bunny-paws` and `jackrabbit` to be passed in, so require those too.

	var jackrabbit = require('jackrabbit');
	var BunnyPaws = require('bunny-paws');
	var RabbitStew = require('rabbit-stew');

Creating a queue requires two parameters. The first is a `jackrabbit#exchange` object and the second is a queue `options` object. This object must have a `bunnyPaws` property that is an instance of `bunny-paws`. All other properties are optional and are the same as those used by `jackrabbit#queue`.

    var exchange = jackrabbit.exchange(process.env.RABBIT_URL);
	var options = {
		bunnyPaws: BunnyPaws.newInstance(process.env.RABBIT_URL)
	};
    var rabbitQueue = RabbitStew.queue(exchange, options);

## Tests

tests are run in docker containers, thus require docker to be installed on
development machines.

Once docker is installed, testing is as easy as

    $ npm test

Without docker, running `npm test` won't work.

### Problems with Running Tests

If you get this error:

    ERROR: Couldn't connect to Docker daemon - you might need to run `docker-machine start default`.

And running `docker-machine start default` doesn't help try

    eval "$(docker-machine env default)"

It might help with the missing configuration environment

