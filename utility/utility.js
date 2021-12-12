const process = require('process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { parseLogs } = require('./loganalyzer');

// Page functions to be exposed
const userAction = (evObject, page, eventLog) => {
	evObject.pageId = getPageId(page);
	eventLog.eventList.push(evObject);
};

const exposedFunctions = { userAction: userAction };

const handleBrowserShutdown = (eventLog) => {
	console.log('Browser shutdown');
	console.log('Events:');
	// console.log(eventLog.eventList);
	for (let event of eventLog.eventList) {
		console.log(event);
	}
	console.log('Network Requests:');
	let count = 0;
	for (let req of eventLog.reqList) {
		console.log(req.substring(0, 50));
		if (count++ > 10) break;
	}
	parseLogs(eventLog);
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

const exposePageFunction = async (page, eventLog) => {
	for (let funcName in exposedFunctions) {
		await page.exposeFunction(funcName, (evObject) =>
			exposedFunctions[funcName](evObject, page, eventLog)
		);
	}
};

const networkRequest = (evObject, page, eventLog) => {
	evObject.pageId = getPageId(page);
	eventLog.reqList.push(evObject.url());
};

const findClosestCommonParent = (lpath, rpath) => {
	let lpath_split = lpath.split('#');
	let rpath_split = rpath.split('#');
	if (lpath_split.length != rpath_split.length) {
		return null;
	}
	let i = 0
	let parent = '';
	while(i < lpath_split.length) {
		if (lpath_split[i] != rpath_split[i]) {
			break;
		}
		parent += lpath_split[i] + '#';
		i++;
	}
	if(i >= lpath_split.length) {
		return null;
	}
	return parent;
}

module.exports = {
	handleBrowserShutdown,
	askQuestion,
	initAndGetConfigs,
	validateLink,
	getPageId,
	exposePageFunction,
	networkRequest,
	findClosestCommonParent,
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
