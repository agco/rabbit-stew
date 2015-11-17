'use strict';

var jackrabbit = require('jackrabbit')

// A simple module to create events for testing
function publishToRabbitMq(exchangeName, routingKey, message) {
	var rabbit = jackrabbit(process.env.RABBIT_URL);
	var exchange = rabbit.topic(exchangeName);

console.log('Publishing: %s to topic exchange:%s with routingKey:%s', message, exchangeName, routingKey)
	exchange
	.publish(message, { key: routingKey })
	.on('drain', function () {
		rabbit.close();
	});
};


function publishToExchange(exchange, routingKey, payload) {
	exchange.publish(payload, { key: routingKey });
}

module.exports = publishToRabbitMq;