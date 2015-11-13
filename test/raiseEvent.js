'use strict';

var jackrabbit = require('jackrabbit');

// A simple module to create events for testing
module.exports = function (resource, event, message) {
	var rabbit = jackrabbit(process.env.RABBIT_URL);

	var key = 'change.events.canAlarms.insert';

	return rabbit
		.default()
		.publish(message, { key: key})
		.on('drain', rabbit.close);
};
