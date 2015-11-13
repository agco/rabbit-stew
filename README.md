# Event-Consumer



## Tests

The tests are set up with Docker + Docker-Compose,
so you don't need to install rabbitmq (or even node)
to run them:

```
$ docker-compose run rabbitStew npm test
```

If you get this error:

    ERROR: Couldn't connect to Docker daemon - you might need to run `docker-machine start default`.

And running `docker-machine start default` doesn't help try

    eval "$(docker-machine env default)"

It might help with the missing configuration environment

