'use strict';
// create a queue to connect to.
// See: github hunterloftis/jackrabbit for how to do this.


// dependencies
var raiseEvent = require('./raiseEvent');

// module under test
var rabbitStew = require('../lib/index');

describe('Event Consumer Module (rabbitStew)', function () {

	it('should connect to a queue', function () {
		return raiseEvent('canAlarms', 'insert', 'hello world');
	});

	it('should call the given callback when an event happens', function (done) {
		var options;
		// options = {
		// 	exchange: 'change.events',
		// 	name: 'test',
		// 	exclusive: true
		// };
		var testConnector = rabbitStew.queueConnector(options);

		testConnector
		.handler({}, function (data) {
console.log('handler:', data)
			testConnector.deregister();
			done();  // event was triggered
		});

		return raiseEvent('canAlarms', 'insert', 'hello world');
	});

});