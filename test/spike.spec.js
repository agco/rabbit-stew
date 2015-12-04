// create a test to verify what happens to a queue when
'use strict'

// what happens when two consumers are created on the same queue. Do the handlers
// fron the first consumer get preserved? or removed/replaced.

const jackrabbit = require('jackrabbit')
const should = require('chai').should()
const Promise = require('bluebird')
const uuid = require('node-uuid')

const RabbitStew = require('../lib/RabbitStew')

const rabbitUrl = process.env.RABBIT_URL
const exchangeName = 'spike_1392'


// this should cleanup a memory leak but...
function deleteQueue(amqplibConnection, queueName) {
	let deferred = Promise.defer();

	amqplibConnection.createChannel((err, channel) => {
		if (err) return deferred.reject(err)

		channel.deleteQueue(queueName, {}, (err, ok) => {
			// TODO: channel.deleteQueue is throwing an error which crashes the
			// test. However the queue (and thus memory leak) has been deleted.
			if (err) {
				return deferred.resolve(err)
			}
			channel.close();
			return deferred.resolve(ok)
		})
	})

	return deferred.promise
}


// this should have deleted the queues attached to this exchange, but it didn't.
// They were just moved to the default exchange. And with random names, difficult
// to track down an delete. Human intervention is best and do it manually.
function deleteExchange(amqplibConnection, exchangeName) {
	let deferred = Promise.defer();

	amqplibConnection.createChannel((err, channel) => {
		if (err) return deferred.reject(err)

		channel.deleteExchange(exchangeName, {}, (err, ok) => {
			if (err) {
				return deferred.resolve()
			}
			channel.close();
			return deferred.resolve()
		})
	})

	return deferred.promise
}

describe.only('spike for testing AGCMD-1392', () => {
	let rabbit, exchange, options

	before(done => {
		rabbit = jackrabbit(rabbitUrl)
		rabbit.on('connected', () => {
			deleteExchange(rabbit.getInternals().connection, exchangeName)
			.then(() => {
				exchange = rabbit.topic(exchangeName)
				options = {
					name: 'test_queue_1',
					exclusive: false,
					durable: false,
					rabbitUrl: rabbitUrl
				}
				done()
			})
			.catch(err => {
				done(err)
			})
			.error(err => {
				done(err)
			})
		})
	})

	after(done => {
		deleteExchange(rabbit.getInternals().connection, exchangeName)
		.then(() => {
			rabbit.close()
			rabbit.on('close', () => {
				done()
			})
		})
	})

	describe('When a queue is created twice, including two differnt consumers', () => {
		const queueName = 'multi-consumers'
		afterEach(() => {
			// an attempt to fix the memory leak but it crashes, somewhere in
			// amqplib and that code is hard to read...
			// so lets not run this code for now.
			// return deleteQueue(rabbit.getInternals().connection, queueName)
		})

		it('should call the correct handler for the given routingKey', function (done) {
			let queue1, queue2, msg1, msg2, msg3

			this.timeout(5000)
			msg1 = uuid.v4()
			msg2 = uuid.v4()
			msg3 = uuid.v4()
			options.name = queueName
			queue1 = RabbitStew.queue(exchange, options);
			return queue1.consume({
				handler1: data => {
					if (data === msg1) {
						msg1 = null
						if (!msg1 && !msg2 && !msg3) done()
					}
					return Promise.resolve('ack')
				}
			})
			.then((queue) => {
				queue2 = RabbitStew.queue(exchange, options)
				return queue2.consume({
					handler2: data => {
						if (data === msg2) {
							msg2 = null
							if (!msg1 && !msg2 && !msg3) done()
						}
						return Promise.resolve('ack')
					},
					handler3: data => {
						if (data === msg3) {
							msg3 = null
							if (!msg1 && !msg2 && !msg3) done()
						}
						return Promise.resolve('ack')
					}

				})
			})
			.then(() => {
				exchange.publish(msg1, { key: 'handler1', persistent: false})
				exchange.publish(msg2, { key: 'handler2', persistent: false})
				exchange.publish(msg3, { key: 'handler3', persistent: false})
			})
		})
	})
})