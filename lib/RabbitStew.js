'use strict';

// dependencies
var jackrabbit = require('jackrabbit');
var _ = require('lodash');

function RabbitStew(options) {
	if (!options || !options.rabbitUrl) throw new Error('RabbitStew missing vital ingredient: rabbitUrl, the RabbitMQ connection URL');

	// connect to RabbitMQ.
	this.config = options;
	this.rabbit = jackrabbit(this.config.rabbitUrl);
	this.exchange = (this.config.exchange)
		? this.rabbit.topic(this.config.exchange)
		: this.rabbit.default();
	this.queues = {};

	return this;
}

RabbitStew.prototype.handler = function (options) {
	var exchange = this.exchange;
	var queues = this.queues;

	function addHandler(queueName, routingKey, handler) {
		queues[queueName] = exchange.queue({ name: queueName, key: routingKey});
		queues[queueName].consume(function (data, ack, nack, msg) {
			handler(data)
			.then(ack)
			.catch(nack)
			.error(nack);
		});
	}

	_.forEach(options, function (value, key) {
		var queueOptions = value;

		addHandler(key, queueOptions.key, queueOptions.handler);
	})
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
module.exports = RabbitStew
