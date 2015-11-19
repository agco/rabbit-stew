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

function RabbitStew(options) {
	if (!options || !options.rabbitUrl) throw new Error('RabbitStew missing vital ingredient: rabbitUrl, the RabbitMQ connection URL');

	// connect to RabbitMQ.
	this.config = options;
	this.rabbit = jackrabbit(this.config.rabbitUrl);
	this.exchange = (this.config.exchange)
		? this.rabbit.topic(this.config.exchange)
		: this.rabbit.default();
	this.queues = {};
	this.bunnyPaws = new bunnyPaws.newInstance(this.config.rabbitUrl, this.config);

	return this;
}

RabbitStew.prototype.handler = function (options) {
	var exchange = this.exchange;
	var queues = this.queues;
	var that = this;

	_.forEach(options, function (handlers, routing) {
		_.forEach(handlers, function (value, key) {
			var routingKey = [routing, key].join('.');
			that._addEventHandler(routingKey, routingKey, value);
	 	});
	});
	return this;
}

RabbitStew.prototype.action = function (options) {
	var that = this;
	var optionsList = (Array.isArray(options)) ? options : [ options ];

	_.forEach(optionsList, function (value) {
		that._addEventHandler(value.queueName, value.routingKey, value.func);
	});
	return this;
}


RabbitStew.prototype._addEventHandler = function _addEventHandler(queueName, routingKey, handler) {
	this.queues[queueName] = this.exchange.queue({ name: queueName, key: routingKey});
	this.queues[queueName].consume(function (data, ack, nack, msg) {
		handler(data)
		.then(ack)
		.catch(nack)
		.error(nack);
	});
	this.bunnyPaws.addPauseResume(this.queues[queueName]);
}

RabbitStew.prototype.pause = function () {
	this.bunnyPaws.pause();
	return this;
}

RabbitStew.prototype.resume = function () {
	this.bunnyPaws.resume();
	return this;
}


RabbitStew.prototype.close = function () {
	return this.rabbit.close();
}

RabbitStew.prototype.getInternals = function () {
	return {
		config: this.config,
		exchange: this.exchange,
		queues: this.queues,
		rabbit: this.rabbit
	}
}


// Public API
module.exports = {
	createConsumers: createConsumers,
	exchange: exchange
}
