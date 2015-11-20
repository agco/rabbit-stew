'use strict';

// dependencies
var jackrabbit = require('jackrabbit');
var _ = require('lodash');
var bunnyPaws = require('bunny-paws');
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
		controller = bunnyPaws.newInstance(options.rabbitUrl);

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
		controller.addPauseResume(rabbitQueue);
		rabbitQueue.consume(handler[typeof consumers](consumers));

		rabbitQueue.on('ready', function () {
			deferred.resolve(queue);
		});

		queue.rabbitQueue = rabbitQueue;
		return deferred.promise;
	}

	function pause() {
		if (rabbitQueue) controller.pause();
		return queue;
	}

	function resume() {
		if (rabbitQueue) controller.resume();
		return queue;
	}

	queue.consume = consume;
	return queue;
}


// Public API
module.exports = {
	queue: queue
}
