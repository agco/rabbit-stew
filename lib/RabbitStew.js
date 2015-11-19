'use strict';

// dependencies
var jackrabbit = require('jackrabbit');
var _ = require('lodash');
var bunnyPaws = require('bunny-paws');


/**
 * create a list of top level keys from given consumersObject
 * @param  {[type]} consumersObject [description]
 * @return {[type]}                 [description]
 */
function createRoutingKeyList(consumersObject) {
	var routingKeyList = [];
	_.forEach(consumersObject, function (handler, routingKey) {
		routingKeyList.push(routingKey);
	});

	return routingKeyList;
}

/**
 * Creates a queue and assigns handlers to listen to various routeKey messages.
 * @param  {} exchange  [description]
 * @param  {[type]} options   [description]
 * @param  {[type]} consumers [description]
 * @return {[type]}           [description]
 */
function createConsumers(exchange, options, consumers) {
	var queue;

	if (!exchange || typeof exchange.queue !== 'function') throw new Error('First argument must be a jackrabbit connection object to RabbitMQ');
	if (!options || typeof options.name !== 'string') throw new Error('Second argument must be an options object');
	if (!consumers || typeof consumers !== 'object') throw new Error('Third argument must define at least one routingKey consumer');

	options.keys = createRoutingKeyList(consumers);
	queue = exchange.queue(options);
	queue.options.consumers = consumers;  // store all consumers with the queue
	queue.consume(function (data, ack, nack, msg) {
console.log('routingKey:', msg.fields.routingKey)
		queue.options.consumers[msg.fields.routingKey](data)
		.then(ack)
		.catch(nack)
		.error(nack);
	});
	return queue;
}


/**
 * Helper function to get a connection to a RabbitMQ instance without needing to
 * require jackrabbit.
 * @param  {[type]} url      location of RabbitMQ
 * @param  {[type]} options  options to connect to a specific topic exchange
 * @return {[type]}         [description]
 */
function exchange(rabbitUrl, exchangeName) {
	return jackrabbit(rabbitUrl).topic(exchangeName);
}


function queue(exchange, options) {
	return exchange.queue(options);
}

// old code
function _addEventHandler(queueName, routingKey, handler) {
	this.queues[queueName] = this.exchange.queue({ name: queueName, key: routingKey});
	this.queues[queueName].consume(function (data, ack, nack, msg) {
		handler(data)
		.then(ack)
		.catch(nack)
		.error(nack);
	});
	this.bunnyPaws.addPauseResume(this.queues[queueName]);
}

function pause() {
	this.bunnyPaws.pause();
	return this;
}

function resume() {
	this.bunnyPaws.resume();
	return this;
}


// Public API
module.exports = {
	createConsumers: createConsumers,
	exchange: exchange,
	queue: queue
}
