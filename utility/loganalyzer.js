const parseLogs = (logData) => {
	// Debug
	console.log('Events:');
	for (let event of logData.events) {
		// console.log('TargetId:', event.pageTargetId);
		console.log(event);
	}
	console.log('Network Requests:');
	for (let request of logData.requests) {
		console.log(request);
	}

	for (let event of logData.events) {
	}
};

module.exports = { parseLogs };
