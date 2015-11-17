'use strict';
// create a queue to connect to.
// See: github hunterloftis/jackrabbit for how to do this.


// dependencies
var publishEvent = require('./publishEvent');
var should = require('chai').should();


// module under test
var RabbitStew = require('../lib/RabbitStew');


// variables


describe('RabbitStew (RabbitMQ generic data consumer) Module', function () {
	var rabbitUrl;
	var dataConsumer;
	var options;
	var exchangeName;

	beforeEach(function () {
		rabbitUrl = process.env.RABBIT_URL;
		exchangeName = 'change.events'
		options = {
			rabbitUrl: rabbitUrl,
			exchange: exchangeName
		};
	});

	it('should be a function', function () {
		RabbitStew.should.be.a.Function;
	});


	describe('Validating `options` argument', function () {
		it('should throw an error if not given a `rabbitUrl`', function (done) {
			// Using RabbitStew.should.throw(Error) doesn't appear to allow
			// calling the function with different parameters
			try {
				var stew = new RabbitStew();
				done('falied to throw error when no RabbitMQ connection URL was provided');
			} catch (err) {
				err.should.match(/RabbitMQ connection URL/);
				done();
			}
		});

		it('should connect to the exchange given by `options.rabbitUrl`', function () {
			var rabbitConnection;

			rabbitConnection = new RabbitStew(options);
			rabbitConnection.should.have.property('handler').and.be.a.Function;

			rabbitConnection.close();

			// pass an invalid url via the options object and catch the error
			// except, jackrabbit doesn't throw an error wit a bad url.
			// options.rabbitUrl = 'causeAnErrorWithInvalidUrl';
			// rabbitConnection = rabbitStew.queueConnector(options).should.throw();
		});
		it('should connect to the exchange ')
	});

	describe('Exchange Connection', function () {
		this.timeout(5000);


		beforeEach(function connectToExchange() {
			dataConsumer = new RabbitStew(options);
		});

		afterEach(function disconnectToExchange() {
			dataConsumer && dataConsumer.close();
		});

		it('should return an API object');

		describe('The getInternals API', function () {

			it('should exist as a function', function () {
				dataConsumer.getInternals.should.be.a.Function;
			})

			describe('the internals object', function () {
				var internals;

				before(function () {
					internals = dataConsumer.getInternals();
				});

				it('should return an `internals` object', function () {
					internals.should.be.an.Object;
				});

				it('should contain the underlying jackrabbit object', function () {
					internals.should.have.property('rabbit').and.be.an.Object;
				});

				it('should contain the underlying exchange object', function () {
					internals.should.have.property('exchange').and.be.an.Object;
				});

				it('should contain the configuration object', function () {
					internals.should.have.property('config').and.be.an.Object;
					internals.config.rabbitUrl.should.be.a.String;
				});

				it('should contain an array of queues')

			});
		});
		describe.only('the action API', function () {
			var routingKey;

			beforeEach(function () {
				routingKey = 'alarms';
			});

			it('should be able to create a queue with options provided', function (done) {
				var msg = 'create a queue with a list of routing keys';
				var actionOptions = {
					queueName: 'alarms',
					routingKey: routingKey,
					func: function handler(data) {
						data.should.equal(msg);
						done();
						return Promise.resolve('OK');
					}
				}
				dataConsumer.action(actionOptions);
				return publishEvent(exchangeName, 'alarms', msg);
			});

			it('should be able to create many queues with an array of options', function (done) {
				var doneCount = 0;
				var msg = 'create many queues';
				var actionOptions = [{
					queueName: 'errorLogs',
					routingKey: 'logs.errors',
					func: function handler(data) {
						data.should.equal(msg);
						doneCount++;
						if (doneCount === 2) done();
						return Promise.resolve('OK');
					}
				}, {
					queueName: 'warningLogs',
					routingKey: 'logs.warnings',
					func: function logWarnings(data) {
						data.should.equal(msg);
						doneCount++;
						if (doneCount === 2) done();
						return Promise.resolve('OK');
					}
				} ];

				dataConsumer.action(actionOptions);
				return Promise.all([
					publishEvent(exchangeName, 'logs.warnings', msg),
					publishEvent(exchangeName, 'logs.errors', msg)
				]);
			});

			it('should create queues with wildcards in them');

		});
		describe('The handler API function', function () {
			var routingKey;

			beforeEach(function () {
				routingKey = 'canAlarms.insert'
			});

			it('should be able to create multiple queues with multiple handlers');
			it('should ack/nack based on the result of the promise returned.');
			it('should derive the routingKey from the first two levels of keys in the options object.');
			it('should pause and resume processing');

			it('should call the given callback when an event happens', function (done) {
				var msg = 'hello event handlers';
				var handlerOptions = {
					'canAlarms': {
						insert: function (data) {
							data.should.equal(msg);
							done();
							return Promise.resolve('OK');
						}
					}
				};

				dataConsumer.handler(handlerOptions);
				return publishEvent(exchangeName, routingKey, msg);
			});
		});
	});

});