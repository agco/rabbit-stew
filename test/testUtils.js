/**
 * Module of utilities to help cleanup RabbitMQ after testing.
 *
 */
'use strict';

// delete the named queue from RabbitMQ
function deleteQueue(connection, queueName) {
	let deferred = Promise.defer();

	connection.createChannel((err, channel) => {
		channel && channel.close()
		if (err) return deferred.reject(err)

		channel.deleteQueue(queueName, {}, (err, ok) => {
			return deferred.resolve(err || ok)
		})
	})
	return deferred.promise
}

function deleteExchange(connection, exchangeName) {
	let deferred = Promise.defer();

	connection.createChannel((err, channel) => {
		if (err) return deferred.reject(err)

		channel.deleteExchange(exchangeName, {}, (err, ok) => {
			channel.close()
			return deferred.resolve();
		})
	})
	return deferred.promise
}

// public API
module.exports = {
	deleteQueue: deleteQueue,
	deleteExchange: deleteExchange
};