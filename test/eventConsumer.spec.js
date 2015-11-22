'use strict';
// create a queue to connect to.
// See: github hunterloftis/jackrabbit for how to do this.


// dependencies
var should = require('chai').should();
var jackrabbit = require('jackrabbit');
var Promise = require('bluebird');

// module under test
var RabbitStew = require('../lib/RabbitStew');

var rabbitUrl = process.env.RABBIT_URL;

describe('RabbitStew (RabbitMQ generic data consumer) Module', function () {
	var rabbit;
	var exchange;
	var options;

	before(function setupExchangeConnection(done) {
		rabbit = jackrabbit(rabbitUrl);
		exchange = rabbit.topic('rabbit.stew.test.exchange');
		options = {
			name: 'testqueue',
			exclusive: false,
			durable: false
		};
		rabbit.on('connected', done)
	});

	after(function closeExchangeConnection(done) {
		rabbit.close();
		rabbit.on('close', done);
	})

	describe('The queue function', function () {
		var queue;
		var options;

		beforeEach(function () {
			options = {
				durable: false,
				exclusive: false,
				rabbitUrl: rabbitUrl
			}
		});

		it('should return a promise with a queue object', function () {
			options.name = 'jackRabbitQueue'
			options.keys = [ 'pass.through', 'routing.keys' ]
			queue = RabbitStew.queue(exchange, options);

			queue.should.have.property('consume').and.be.a.Function;
			queue.should.not.have.property('exchange');
			queue.should.not.have.property('options');
		});

		describe('The queue.consume function', function () {
			var key;
			beforeEach(function () {
				key = 'consume.function.test';
			});

			it('should return a rejected promise when no routingKey was defined', function () {
				return RabbitStew.queue(exchange, options).consume(function noRoutingKey(data) {
					return Promise.resolve('ack');
				})
				.then(function failTest() {
					throw new Error('should reject with `no routingKey Error`');
				})
				.catch(function (err) {
					err.should.match(/ERROR:.*no.*routingKey/);
				});
			});

			it('should return a promise containing the queue once created ready to handle requests.', function () {
				options.name = 'test.promise.returned';

				return RabbitStew.queue(exchange, options).consume({
					'test': function handler(data) {
						return Promise.resolve('ack');
					}
				}).then(function validateQueueReturned(queue) {
					queue.should.have.property('rabbitQueue');
				});
			});

			it('should create a queue and attach consumers', function (done) {
				var payload = 'test payload for consumption';
				var queue;

				options.name = 'test.queue.consumes.data';

				return RabbitStew.queue(exchange, options)
				.consume({
					'consume.function.test': function (data) {
						data.should.equal(payload);
						done();
						return Promise.resolve('ack');
					}
				})
				.then(function publishTestMessage() {
						exchange.publish(payload, { key: 'consume.function.test' });
				});
			});

			it.skip('should create a queue with multiple consumers', function (done) {
				var payloadA = 'payload for consumer.A';
				var payloadB = 'payload for consumer.B';
				var receivedA = false;
				var receivedB = false;

				options.name = 'test.multiple.consumers';
				queue = RabbitStew.queue(exchange, options)
				.consume({
					'consumer.A': function (data) {
						data.should.equal(payloadA);
						receivedA = true;
						if (receivedA && receivedB) done();
						return Promise.resolve('ack');
					},
					'consumer.B': function (data) {
						data.should.equal(payloadB);
						receivedB = true;
						if (receivedA && receivedB) done();
						return Promise.resolve('ack');
					}
				})
				.then(function publishTwoMessages(queue) {
					exchange.publish(payloadA, { key: 'consumer.A' });
					exchange.publish(payloadB, { key: 'consumer.B' });
				});
			});
			it('should create a single consumer for multiple routingKeys', function () {
				var payloadA = 'testing one consumer';
				var payloadB = 'can get messages from many routingKeys';
				var gotA = false;
				var gotB = false;

				options.name = 'test.one.consumer.many.keys';
				options.keys = [ 'one.consumer', 'many.keys' ];
				queue = RabbitStew.queue(exchange, options)
				.consume(function justOneConsumer(data) {
					gotA = (data === payloadA);
					gotB = (data === payloadB);
					if (gotA && gotB) return done();
					return Promise.resolve('ack');
				})
				.then(function publishSomeMessages() {
					exchange.publish(payloadA, { key: 'one.consumer' });
					exchange.publish(payloadB, { key: 'many.keys' });
				});
			});
		});
		describe('The queue.pause function', function () {
			it('should exist as a property of queue and be a function', function () {
				var queue = RabbitStew.queue(exchange, options);

				queue.should.have.property('pause').and.be.a.Function;
			});
			it('should reject the promise when the queue has not yet been instantiated', function () {
				var queue = RabbitStew.queue(exchange, options);

				return queue.pause()
				.then(function () {
					throw new Error('ERROR: should reject pause request');
				})
				.catch(function (err) {
					err.should.match(/ERROR:.*not.*instantiated/);
				});
			});
			it('should return the queue', function () {
				var queue;

				options.name = 'test.pause.returns.queue';
				queue = RabbitStew.queue(exchange, options);

				return queue.consume({
					'dummyRoutingKey': function dummyHandler(data) {
						return Promise.reslove('ack');
					}
				})
				.then(function pauseQueue(queue) {
					return queue.pause();
				})
				.then(function validateQueue(queue) {
					should.exist(queue.rabbitQueue.options.name);
					queue.rabbitQueue.options.name.should.equal(options.name);
				});
			});
			it('should pause all queue consumers');
		});
		describe('The queue.resume function', function () {
			it('should exist as a property of queue and be a function', function () {
				var queue = RabbitStew.queue(exchange, options);

				queue.should.have.property('resume').and.be.a.Function;
			});
			it('should reject the promise when the queue has not yet been instantiated', function () {
				var queue = RabbitStew.queue(exchange, options);

				return queue.resume()
				.then(function shouldNotBeCalled(queue) {
					throw new Error('ERROR: should have rejected the resume request');
				})
				.catch(function validateError(err) {
					err.should.match(/ERROR.*not.*instantiated/);
				});
			})
			it('should return the queue', function () {
				var queue;

				options.name = 'test.resume.returns.queue'
				queue = RabbitStew.queue(exchange, options);

				return queue.consume({
					'dummyRoutingKey': function dummyHandler(data) {
						return Promise.resolve('ack');
					}
				})
				.then(function resumeQueue(queue) {
					return queue.resume();
				})
				.then(function validateQueue(queue) {
					should.exist(queue.rabbitQueue.options.name);
					queue.rabbitQueue.options.name.should.equal(options.name);
				});
			});
			it('should allow all queue consumers to resume processing the queue');
		})


	});

});
