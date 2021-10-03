const process = require('process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Page functions to be exposed
const documentClick = (evObject, page, pageEvents) => {
	const pageId = getPageId(page);
	if (pageEvents[pageId] === undefined) {
		pageEvents[pageId] = {
			eventList: [],
			requestList: [],
		};
	}
	pageEvents[pageId].eventList.push(evObject);
};

const exposedFunctions = { documentClick: documentClick };

const handleBrowserShutdown = (pageEvents) => {
	console.log('Browser shutdown');
	for (let page in pageEvents) {
		console.log('TargetId:', page);
		console.log('Events:');
		for (let event of pageEvents[page].eventList) {
			console.log(event);
		}
		console.log('Network Requests:');
		let count = 0;
		for (let req of pageEvents[page].requestList) {
			console.log(req.substring(0, 50));
			if (count++ > 10) break;
		}
	}
};

const askQuestion = (query) => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) =>
		rl.question(query, (ans) => {
			rl.close();
			resolve(ans);
		})
	);
};

const validateLink = (url) => {
	let isValid = url.match(
		'(https?://(?:www.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|www.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9].[^s]{2,}|https?://(?:www.|(?!www))[a-zA-Z0-9]+.[^s]{2,}|www.[a-zA-Z0-9]+.[^s]{2,})'
	);
	if (!isValid) {
		console.log('Invalid start link!');
		url = 'chrome://newtab';
	}
	return url;
};

const initAndGetConfigs = () => {
	const configs = {
		userDataDir: path.join(__dirname, '../userData'),
		browserConfig: {
			headless: false,
			userDataDir: '',
			args: ['--window-size=800,700', '--enable-features=NetworkService'],
			ignoreHTTPSErrors: true,
		},
		serviceWorkerPath: path.resolve('./service-worker.js'),
		eventTypes: ['click', 'contextmenu', 'copy'],
	};
	configs.browserConfig.userDataDir = configs.userDataDir;
	if (!fs.existsSync(configs.userDataDir)) {
		fs.mkdirSync(configs.userDataDir, 0744);
	}
	return configs;
};

const getPageId = (page) => {
	return page._target._targetInfo.targetId;
};

const exposePageFunction = async (page, pageEvents) => {
	for (let funcName in exposedFunctions) {
		await page.exposeFunction(funcName, (evObject) =>
			exposedFunctions[funcName](evObject, page, pageEvents)
		);
	}
};

const networkRequest = (evObject, page, pageEvents) => {
	const pageId = getPageId(page);
	if (pageEvents[pageId] === undefined) {
		pageEvents[pageId] = {
			eventList: [],
			requestList: [],
		};
	}
	pageEvents[pageId].requestList.push(evObject.url());
};

module.exports = {
	handleBrowserShutdown,
	askQuestion,
	initAndGetConfigs,
	validateLink,
	getPageId,
	exposePageFunction,
	networkRequest,
};

/* Extras

const addPage = (page, prevPageEvents) => {
	const id = page._target._targetInfo.targetId;
	const newPageEvent = {};
	newPageEvent[id] = {
		eventList: [],
		requestList: [],
	};
	prevPageEvents.push(newPageEvent);
	return prevPageEvents;
};

*/
