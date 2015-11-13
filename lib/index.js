'use strict';
// connect to an amqp server


// listen for messages on a particular queue


// call given code when event happens.


// dependencies
var jackrabbit = require('jackrabbit');


module.exports = {
	/**
	 * creates a consumer fo the change.events queue.
	 * options: object
	 *   exchange:  name of the exchange
	 *   name:
	 *   exclusive:
	 * @param  {[type]} options [description]
	 * @return {[type]}         [description]
	 */
	queueConnector: function (options) {
		var rabbit = jackrabbit(process.env.RABBIT_URL);
		var handler;

		function onMessage(data) {
			if (handler) {
				return handler(data);
			}
			return;
		}

		rabbit
			.default()
			.queue({ name: 'change.events.canAlarms.insert'})
			.consume(onMessage, { noAck: false });

		return {
			handler: function (options, func) {
				handler = func
			},
			deregister: function () {
				handler = null;
			}
		}
	}

}












