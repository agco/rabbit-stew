'use strict';
// create a queue to connect to.
// See: github hunterloftis/jackrabbit for how to do this.


// dependencies
var should = require('chai').should();
var rabbit = require('jackrabbit');

// module under test
var RabbitStew = require('../lib/RabbitStew');

var rabbitUrl = process.env.RABBIT_URL;

describe('RabbitStew (RabbitMQ generic data consumer) Module', function () {
	var exchange;
	var options;
	var consumers;

	before(function setupExchangeConnection() {
		exchange = rabbit(rabbitUrl).topic('rabbit.stew.test.exchange');
		options = {
			name: 'testqueue',
			exclusive: false,
			durable: false
		};
		consumers = {
			'routingKey': function handler() {}
		};
	});

	describe('The createConsumers function', function () {
		it('should throw an error if the first argument is not a jackrabbit exchange object', function (done) {
			try {
				RabbitStew.createConsumers();
			} catch (err) {
				err.should.match(/First argument.*RabbitMQ/);
			}
			try {
				RabbitStew.createConsumers({ fake: 'exchange object'});
			} catch (err) {
				err.should.match(/First argument.*RabbitMQ/);
			}
			try {
				RabbitStew.createConsumers(exchange, options, consumers);
				done();
			} catch (err) {
				done('FAILED: Should work with a real jackrabbit excange');
			}
		});
		it('should throw an error if the second argument is not a queue configuration object', function (done) {
			try {
				RabbitStew.createConsumers(exchange);
			} catch (err) {
				err.should.match(/Second argument/);
			}
			try {
				RabbitStew.createConsumers(exchange, { bogus: 'options object' })
			} catch (err) {
				err.should.match(/Second argument/);
			}
			try {
				RabbitStew.createConsumers(exchange, options, consumers);
				done();
			} catch (err) {
				done('FAILED: Should work with a valid options object');
			}
		});
		it('should throw an error if the third argument is not an object defining at least one routingKey/function handler', function (done) {
			try {
				RabbitStew.createConsumers(exchange, options);
			} catch (err) {
				err.should.match(/Third argument.*routingKey.*consumer/);
			}
			try {
				RabbitStew.createConsumers(exchange, options, 'bogus routingKey and function handler');
			} catch (err) {
				err.should.match(/Third argument.*routingKey.*consumer/);
			}
			try {
				RabbitStew.createConsumers(exchange, options, consumers);
				done();
			} catch (err) {
				done('FAILED: Should work with a valid consumers object');
			}
		});

		it('should return a queue object', function () {
			var queue = RabbitStew.createConsumers(exchange, options,consumers);

			queue.should.have.property('consume').and.be.a.Function;
			queue.should.have.property('options').and.be.an.Object;
			queue.options.should.have.property('consumers').and.be.an.Object;
		});

		// TODO: it would be nice to destroy queues once created for cleanup but jackrabbit doesn't provide this.
		it.skip('should return a destroyable queue object', function () {
			var queue = RabbitStew.createConsumers(exchange, options, consumers);
			queue.should.be.an.Object;
			queue.destroy.should.be.a.Function;
		});

		it('should work with a simple happy path', function (done) {
			var payload = 'test payload';
			var consumersQueue;

			consumers = {
				'simple.test': function (data) {
					data.should.equal(payload);
					done();
					return Promise.resolve('ack');
				}
			};
			consumersQueue = RabbitStew.createConsumers(exchange, options, consumers);

			return exchange.publish(payload, { key: 'simple.test'});
		});
		it('should pass payloads with different routing keys to different consumers.')
		it('should not retry payloads with invalid routing keys')
	});

	describe('the exchange function', function () {
		it('should be a function', function () {
			RabbitStew.exchange.should.be.a.Function;
		});
		it('should return a jackrabbit exchange object', function () {
			var exchange = RabbitStew.exchange(rabbitUrl, 'rabbit.stew.test.exchange');

			exchange.should.have.property('type').and.equal('topic');
			exchange.should.have.property('options').and.be.an.Object;
			exchange.should.have.property('queue').and.be.a.Function;
			exchange.should.have.property('connect').and.be.a.Function;
			exchange.should.have.property('publish').and.be.a.Function;
		});
	});

	describe('the queue function', function () {
		var queue;
		// for returning a jackrabbit queue
		it('should return a jackrabbit queue object', function () {
			queue = RabbitStew.queue(exchange, { name: 'jackrabbitQueue', keys: [ 'pass.through', 'routing.keys']});
			queue.should.have.property('consume').and.be.a.Function;
			queue.should.have.property('options').and.be.an.Object;
			queue.options.should.have.property('keys').and.be.an.Array
			queue.options.keys[0].should.equal('pass.through');
		});

		describe('the consume function', function () {
			var key;
			var options;
			beforeEach(function () {
				key = 'consume.function.test';
				options = {
					name: 'test.consume.function',
					durable: false,
					exclusive: false,
					key: [ key ]
				}
				queue = RabbitStew.queue(exchange, options);
			});

			it('should create a single consumer handler to the queue.', function (done) {
				var payload = 'test data for single consumer handler';

				queue.consume(function handler(data) {
					data.should.equal(payload);
					done();
					return Promise.resolve('ack');
				});
				exchange.publish(payload, { key: key });
			});
			it('should call the same handler for all routingKeys defined for the queue', function (done) {
				var payloadA = 'payload for consumer.A';
				var payloadB = 'payload for consumer.B';
				var routingKeyA = 'consumer.A';
				var routingKeyB = 'consumer.B';
				var receivedA = false;
				var receivedB = false;

				delete options.key;
				options.keys = [ routingKeyA, routingKeyB ];
				queue = RabbitStew.queue(exchange, options);
				queue.consume(function handler(data) {
					if (data === payloadA) {
						if (receivedA) {
							done('ERROR: payload for routingKeyA received multiple times');
							return Promise.reject('nack');
						} else {
							payloadA = true;
						}
					}
					if (data === payloadB) {
						if (receivedB) {
							done('ERROR: payload for routingKeyB received multiple times');
							return Promise.reject('nack');
						} else {
							payloadB = true;
						}
					}
					if (receivedA && receivedB) {
						done();
					}
					return Promise.resolve('ack')
				});
				exchange.publish(payloadA, { key: routingKeyA });
				exchange.publish(payloadB, { key: routingKeyB });
			});
			it('should not call the handler for routingKeys not defined for the queue', function (done) {
				var payload = 'this should never be seen';

				queue.consume(function handler(data) {
					done('ERROR: this handler should not be called as the routingKey is different.');
					return Promise.reject('nack');
				});

				exchange.publish(payload, { key: 'invalid.consume.function.test' });
				setTimeout(done, 500);
			});
		});

	});

});
