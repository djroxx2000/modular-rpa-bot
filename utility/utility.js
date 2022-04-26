const process = require('process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { parseLogs } = require('./loganalyzer.js');
const puppeteer = require('puppeteer');

// Page functions to be exposed
const saveEvent = (evObject, page, pageEvents) => {
	const pageId = getPageId(page);
	// if (pageEvents[pageId] === undefined) {
	// 	pageEvents[pageId] = {
	// 		eventList: [],
	// 		requestList: [],
	// 	};
	// }
	evObject.targetPageId = pageId;
	pageEvents.events.push(evObject);
};

const saveReplayData = (savedEvents, eventLog) => {
	eventLog.data.push(savedEvents);
	console.log('Printing events:', eventLog.data);
};

const exposedFunctions = { saveEvent: saveEvent };

const handleBrowserShutdown = (pageEvents, startLink) => {
	console.log('Browser shutdown');
	let logData = [];
	// for (let event of pageEvents.events) {
	// 	logData.push({ pageTargetId: page });
	// 	logData[logData.length - 1].events = [];
	// 	for (let event of pageEvents[page].eventList) {
	// 		logData[logData.length - 1].events.push(event);
	// 	}
	// 	logData[logData.length - 1].networkReq = [];
	// 	let count = 0;
	// 	for (let req of pageEvents[page].requestList) {
	// 		logData[logData.length - 1].networkReq.push(req);
	// 		if (count++ > 10) break;
	// 	}
	console.log(pageEvents);
	fs.writeFileSync('file.log', JSON.stringify(pageEvents), (err) => {
		console.log(err.message);
	});
	startNewSession(pageEvents.data, startLink);
};

const startNewSession = async (logs, startLink) => {
	const browser = await puppeteer.launch(configData.browserConfig);
	await browser
		.defaultBrowserContext()
		.overridePermissions(startLink, ['clipboard-read', 'clipboard-write']);
	const page = await browser.newPage();
	await page.setBypassCSP(true);
	await page._client.send('Network.setBypassServiceWorker', { bypass: true });
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
	await page.exposeFunction('saveReplayData', (savedEvents) => {
		saveReplayData(savedEvents, pageEvents);
	});
};

const networkRequest = (evObject, page, pageEvents) => {
	const pageId = getPageId(page);
	// if (pageEvents[pageId] === undefined) {
	// 	pageEvents[pageId] = {
	// 		eventList: [],
	// 		requestList: [],
	// 	};
	// }
	pageEvents.requests.push({ pageTargetId: pageId, url: evObject.url() });
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
