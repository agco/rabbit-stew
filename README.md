# RabbitStew

A Generic Event Consumer for RabbitMQ.


## Tests

tests are run in docker containers, thus require docker to be installed on
development machines.

Once docker is installed and running, testing is as easy as

    $ npm test

### Problems with Running Tests

If you get this error:

    ERROR: Couldn't connect to Docker daemon - you might need to run `docker-machine start default`.

And running `docker-machine start default` doesn't help try

    eval "$(docker-machine env default)"

It might help with the missing configuration environment
