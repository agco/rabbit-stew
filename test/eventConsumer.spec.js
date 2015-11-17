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
		describe('The handler API function', function () {
			var routingKey;

			beforeEach(function () {
				routingKey = 'canAlarms.insert'
			});

			it('should call the given callback when an event happens', function (done) {
				var msg = 'hello event handlers';
				var handlerOptions = {
					'canAlarms': {
						key: routingKey,
						handler: function (data) {
							console.log('My Event Handler:', data);
							data.should.equal(msg);
							done();
							return Promise.resolve('OK');
						}
					}
				};

				dataConsumer.handler(handlerOptions);
				return publishEvent('change.events', routingKey, msg);
			});
		});
	});

});