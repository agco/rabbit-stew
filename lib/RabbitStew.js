'use strict';

// dependencies
var jackrabbit = require('jackrabbit');
var _ = require('lodash');
var BunnyPaws = require('bunny-paws');
var Promise = require('bluebird');


/**
 * This returns an object which stores the information necessary to create a
 * queue. along with a consume function. The consume function will create the
 * queue along with the consumers.
 *
 * @param  {[type]} exchange [description]
 * @param  {[type]} options  [description]
 * @return {[type]}          [description]
 */
function queue(exchange, options) {
	var queue = {},
		rabbitQueue,
		handlers,
		bunnyPaws = BunnyPaws.newInstance(options.rabbitUrl);

	function consume(consumers) {
		var deferred = Promise.defer();
		var handler = {
			'object': function createMultiConsumerHandler(handlers) {
				return function (data, ack, nack, msg) {
					handlers[msg.fields.routingKey](data)
					.then(ack)
					.catch(nack)
					.error(nack);
				};
			},
			'function': function createSingleConsumer(func) {
				return function (data, ack, nack, msg) {
					func(data)
					.then(ack)
					.catch(nack)
					.error(nack);
				};
			}
		};

		handlers = consumers;

		if (typeof consumers === 'object') {
			options.keys = Object.keys(consumers);
		} else {
			if (!options.key && !options.keys) {
				return Promise.reject('ERROR: queue has no routingKey defined.');
			}
		}

		rabbitQueue = exchange.queue(options);
		bunnyPaws.addPauseResume(rabbitQueue.consume(handler[typeof consumers](handlers)));

		rabbitQueue.on('ready', function () {
			deferred.resolve(queue);
		});

		queue.rabbitQueue = rabbitQueue;
		return deferred.promise;
	}

	function pause() {
		if (!rabbitQueue) return Promise.reject('ERROR: queue not instantiated yet');

		return Promise.delay(1000)
		.then(function () {
			return bunnyPaws.pause(rabbitQueue.name);
		})
		.then(function () {
			return Promise.delay(1000);
		})
		.then(function returnQueue(val) {
			return Promise.resolve(queue);
		})
		.catch(function returnError(err) {
			return Promise.reject(err);
		});
	}

	function resume() {
		if (!rabbitQueue) return Promise.reject('ERROR: queue not instantiated yet');
		return Promise.delay(1000)
		.then(function () {
			return bunnyPaws.resume(rabbitQueue.name);
		})
		.then(function () {
			return Promise.delay(1000);
		})
		.then(function returnQueue() {
			return Promise.resolve(queue);
		})
		.catch(function returnError(err) {
			return Promise.reject(err);
		})
	}

	queue.pause = pause;
	queue.resume = resume;
	queue.consume = consume;
	return queue;
}


// Public API
module.exports = {
	queue: queue
}
