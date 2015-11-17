'use strict';

// dependencies
var jackrabbit = require('jackrabbit');
var _ = require('lodash');
var bunnyPaws = require('bunny-paws');


// private functions



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
module.exports = RabbitStew
