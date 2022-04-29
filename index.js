const puppeteer = require('puppeteer');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const sql = require('mysql2/promise');
const { evalFunctions } = require('./utility/eventhandlers');
const {
	askQuestion,
	validateLink,
	initAndGetConfigs,
	exposePageFunction,
	queriesLite,
	queries,
	getUTCTimeObj,
} = require('./utility/utility');

const getSqliteInstance = async () => {
	try {
		const db = await open({
			filename: './eventDatabase.db',
			driver: sqlite3.cached.Database,
		});
		return db;
	} catch (error) {
		console.log('Unable to connect to local sqlite database:\n', error.message);
		process.exit();
	}
};

const getMysqlInstance = async () => {
	try {
		const db = await sql.createConnection({
			host: 'remotemysql.com',
			user: 'tkAMBHlKsi',
			database: 'tkAMBHlKsi',
			password: '06KK4DMwg7',
			port: '3306',
		});
		return db;
	} catch (error) {
		console.error('Unable to connect to MySQL server:\n', error.message);
		process.exit();
	}
};

const goToPlayback = async () => {
	const storage = await askQuestion(
		'Fetch from: \n1. Cloud \n2. Local (eventDatabase.db must be present)\n'
	);
	let eventList = [];
	if (storage == 2 || storage == '2') {
		const db = await getSqliteInstance();
		eventList = await db.all(queriesLite.select);
	} else {
		const db = await getMysqlInstance();
		eventList = await db.query(queries.select);
		eventList = eventList[0];
	}

	let query = 'Which script would you like to playback?\n';
	eventList.forEach((eventRow, idx) => {
		query += `${idx + 1}. ${eventRow.title}\n`;
	});
	const answer = await askQuestion(query);
	const idx = parseInt(answer) - 1;
	const event = JSON.parse(eventList[idx].eventLog);
	// event.data[0] = JSON.parse(event.data[0]);
	console.log(eventList[idx].startLink);
	startBrowserPlayback(event.data, eventList[idx].startLink);
};

const pagePerformTasks = (curEvent) => {
	console.log('Passed data:', curEvent);

	// include jquery
	const scriptJQuery = document.createElement('script');
	scriptJQuery.type = 'text/javascript';
	scriptJQuery.src = 'https://code.jquery.com/jquery-3.4.1.js';
	scriptJQuery.integrity = 'sha256-WpOohJOqMqqyKL9FccASB9O0KwACQJpFTUBLTYOVvVU=';
	scriptJQuery.crossOrigin = 'anonymous';

	// include replay script
	const scriptReplay = document.createElement('script');
	scriptReplay.type = 'text/javascript';
	scriptReplay.src = 'http://127.0.0.1:5500/alt/js-replay/replay.js';

	// Add script on page load and start recording
	window.addEventListener('load', (ev) => {
		console.log('Load event triggered', ev);
		document.body.appendChild(scriptJQuery);
		document.body.appendChild(scriptReplay);
		scriptReplay.onload = function () {
			const widgetTest = new jsReplay.playback(curEvent);
			widgetTest.start();
		};
		scriptJQuery.onload = function () {
			$('a[target="_blank"]').removeAttr('target');
		};
	});
};

const startBrowserPlayback = async (events, startLink) => {
	const configData = initAndGetConfigs();
	const browser = await puppeteer.launch(configData.browserConfig);
	await browser
		.defaultBrowserContext()
		.overridePermissions(startLink, ['clipboard-read', 'clipboard-write']);
	const page = await browser.newPage();
	await page.setBypassCSP(true);
	await page._client.send('Network.setBypassServiceWorker', { bypass: true });
	page.on('framenavigated', () => {
		if (events.length <= 0) {
			return;
		}
		page.evaluate(pagePerformTasks, events[0]);
		events.shift();
	});

	browser.on('disconnected', () => {
		process.exit();
	});

	try {
		await page.goto(startLink);
	} catch (error) {
		console.log('Error in navigating to given link:', error.message);
		await page.goto('chrome://newtab');
	}
};

const handleBrowserShutdown = async (events, startLink) => {
	if (events === null || events === undefined) {
		console.log('Got null');
		return;
	}
	console.log(events.data.length);
	for (let i = 0; i < events.data.length; i++) {
		let data = JSON.parse(events.data[i]);
		data.index = i;
		events.data[i] = JSON.stringify(data);
	}
	const storage = await askQuestion('Storage: \n1. Cloud \n2. Local');
	const title = await askQuestion('Set title for recorded log: \n');
	const desc = await askQuestion('Write a short description for the log: \n');
	if (storage == 2 || storage == '2') {
		try {
			const db = await getSqliteInstance();
			db.exec(queriesLite.create);
			const stmt = await db.prepare(queriesLite.insert);
			await stmt.bind({
				1: JSON.stringify(events),
				2: title,
				3: desc,
				4: startLink,
				5: JSON.stringify(getUTCTimeObj()),
			});
			await stmt.run();
		} catch (error) {
			console.log(error.message);
		}
	} else {
		try {
			const db = await getMysqlInstance();
			await db.execute(queries.insert, [
				JSON.stringify(events),
				title,
				desc,
				startLink,
				JSON.stringify(getUTCTimeObj()),
			]);
		} catch (error) {
			console.log(error.message);
		}
	}

	let answer = await askQuestion('Start playback? (Y/N) ');
	if (answer != 'Y') {
		console.log(answer);
		process.exit();
	}
	startBrowserPlayback(events.data, startLink);
};

(async () => {
	// TODO: Take more relevant console input before launching browser
	const configData = initAndGetConfigs();
	let answer = await askQuestion(
		'What would you like to do? \n1. Record \n2. Playback \n Enter 1 or 2\n'
	);
	if (answer == 2 || answer == '2') {
		goToPlayback();
		return;
	}

	answer = await askQuestion('\nStarting point (URL): ');
	let url = validateLink(answer);
	startLink = url;

	const browser = await puppeteer.launch(configData.browserConfig);
	await browser
		.defaultBrowserContext()
		.overridePermissions(startLink, ['clipboard-read', 'clipboard-write']);
	const page = await browser.newPage();
	await page.setBypassCSP(true);
	await page._client.send('Network.setBypassServiceWorker', { bypass: true });

	const pageEvents = { data: [] };
	await exposePageFunction(page, pageEvents);

	const pageEvaluateTasks = (data) => {
		console.log('Passed data:', data);

		// include jquery
		const scriptJQuery = document.createElement('script');
		scriptJQuery.type = 'text/javascript';
		scriptJQuery.src = 'https://code.jquery.com/jquery-3.4.1.js';
		scriptJQuery.integrity = 'sha256-WpOohJOqMqqyKL9FccASB9O0KwACQJpFTUBLTYOVvVU=';
		scriptJQuery.crossOrigin = 'anonymous';

		// include replay script
		const scriptReplay = document.createElement('script');
		scriptReplay.type = 'text/javascript';
		scriptReplay.src = 'http://127.0.0.1:5500/alt/js-replay/replay.js';

		// Add script on page load and start recording
		window.addEventListener('load', (_) => {
			// console.log('Loading first time');
			document.body.appendChild(scriptJQuery);
			document.body.appendChild(scriptReplay);
			document.getElementsByTagName('a');
			scriptReplay.onload = function () {
				// console.log('Loading again...');
				jsReplay.record.start();
			};
			scriptJQuery.onload = function () {
				$('a[target="_blank"]').removeAttr('target');
			};
		});

		// stop recording and pass data back to nodejs on close
		window.addEventListener('beforeunload', (ev) => {
			jsReplay.record.stop();
		});
	};

	const pageEvaluateData = {
		serviceWorkerPath: configData.serviceWorkerPath,
		types: configData.eventTypes,
		evalFunctions,
	}; // TODO: Make customizable via console

	// const startRecordOnNewPage = async (page, tasks, data) => {
	// 	await page.evaluateOnNewDocument(tasks, data);
	// };

	// startRecordOnNewPage(page, pageEvaluateTasks, pageEvaluateData);

	page.on('framenavigated', () => {
		page.evaluate(pageEvaluateTasks, pageEvaluateData);
	});

	try {
		await page.goto(startLink);
	} catch (error) {
		console.log('Error in navigating to given link:', error.message);
		await page.goto('chrome://newtab');
	}

	let closeWait = false;
	const handlePageClose = async (_) => {
		// Debounce
		if (closeWait !== false) {
			return;
		}
		closeWait = setTimeout(() => {
			closeWait = false;
		}, 500);
		try {
			const pageList = await browser.pages();
			const pageDetail = pageList.map((ele) => ele._target._targetInfo);
			console.log('Page closed\n', pageDetail, '\n\n');
		} catch (error) {
			if (
				error.message !=
				'Protocol error (Target.attachToTarget): No target with given id found'
			) {
				console.log(error.message);
			}
		}
	};

	let openWait = false;
	const handlePageOpen = async (_) => {
		// Debounce
		if (openWait !== false) {
			return;
		}
		openWait = setTimeout(() => {
			openWait = false;
		}, 500);
		try {
			const pageList = await browser.pages();
			const pageDetail = pageList.map((ele) => ele._target._targetInfo);
			console.log('Page opened\n', pageDetail);
		} catch (error) {
			if (
				error.message !=
				'Protocol error (Target.attachToTarget): No target with given id found'
			) {
				console.log(error.message);
			}
		}
	};

	let changeWait = false;
	const handleTargetChange = async (target) => {
		// Debounce
		if (changeWait !== false) {
			return;
		}
		changeWait = setTimeout(() => {
			changeWait = false;
		}, 500);

		try {
			const pages = await browser.pages();
			let changedPage = null;
			for (let page of pages) {
				if (page._target._targetInfo.targetId === target._targetInfo.targetId) {
					changedPage = page;
					break;
				}
			}
		} catch (error) {
			if (
				error.message !=
				'Protocol error (Target.attachToTarget): No target with given id found'
			) {
				console.log(error.message);
			}
		}
	};

	page.on('close', async (evObject) => {
		console.log('page close: ', page._target._targetInfo.targetId, evObject);
		console.log(pageEvents);
	});

	browser.on('targetcreated', handlePageOpen);
	browser.on('targetdestroyed', handlePageClose);
	browser.on('targetchanged', handleTargetChange);
	browser.on('disconnected', () => {
		handleBrowserShutdown(pageEvents, startLink);
	});
})();
