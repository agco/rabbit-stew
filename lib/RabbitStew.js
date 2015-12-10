'use strict';

// dependencies
var _ = require('lodash');
var Promise = require('bluebird');


/**
 * This returns an object which stores the information necessary to create a
 * queue. along with a consume function. The consume function will create the
 * queue along with the consumers.
 *
 * @param  {[type]} exchange [description]
 * @param  {[type]} options  [description]
 * @return {[type]}          [description]
 * @throws {'NoBunnyPaws'} If no BunnyPaws instance is given in options.bunnyPaws
 */
function queue(exchange, options) {
	var queue = {},
		rabbitQueue,
		handlers;

	if (!options.bunnyPaws || typeof options.bunnyPaws.addPauseResume !== 'function') {
		throw new Error('No BunnyPaws instance.')
	}

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

		// FIXME: this returns before the functionality is actually available. Delays are used
		// on pause and resume calls. (JIRA 1351)
		options.bunnyPaws.addPauseResume(rabbitQueue.consume(handler[typeof consumers](handlers)));

		rabbitQueue.on('ready', function () {
			// FIXME: the routingKeys may not have been completely created by the
			// time this event is raised. (JIRA 1352)
			return Promise.delay(50)
			.then(function () {
				deferred.resolve(queue);
			})
		});

		queue.rabbitQueue = rabbitQueue;
		return deferred.promise;
	}

	function pause() {
		if (!rabbitQueue) return Promise.reject('ERROR: queue not instantiated yet');

		// FIXME: these delays are because we don't know when the pause/resume ability
		// is actually functional. (JIRA 1351)
		return Promise.delay(1000)
		.then(function () {
			return options.bunnyPaws.pause(rabbitQueue.name);
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
		// FIXME: these delays are because we don't know when the pause/resume ability
		// is actually functional. (JIRA 1351)
		return Promise.delay(1000)
		.then(function () {
			return options.bunnyPaws.resume(rabbitQueue.name);
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
