const puppeteer = require('puppeteer');
const { evalFunctions } = require('./utility/eventhandlers');
const {
	askQuestion,
	validateLink,
	initAndGetConfigs,
	exposePageFunction,
} = require('./utility/utility');

(async () => {
	// TODO: Take more relevant console input before launching browser
	const configData = initAndGetConfigs();
	let answer = await askQuestion('Starting point (URL): ');
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
		window.addEventListener('load', (ev) => {
			console.log(ev);
			document.body.appendChild(scriptJQuery);
			document.body.appendChild(scriptReplay);
			setTimeout(() => {
				jsReplay.record.start();
			}, 500);
		});

		// stop recording and pass data back to nodejs on close
		window.addEventListener('beforeunload', (ev) => {
			jsReplay.record.stop();
		});
	};

	const pagePerformTasks = (events) => {
		console.log('Passed data:', events.data);

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
			console.log(ev);
			document.body.appendChild(scriptJQuery);
			document.body.appendChild(scriptReplay);
			setTimeout(() => {
				const widgetTest = new jsReplay.playback(events.data[0]);
				widgetTest.start();
			}, 500);
		});
	};

	const pageEvaluateData = {
		serviceWorkerPath: configData.serviceWorkerPath,
		types: configData.eventTypes,
		evalFunctions,
	}; // TODO: Make customizable via console

	const startRecordOnNewPage = async (page, tasks, data) => {
		await page.evaluateOnNewDocument(tasks, data);
	};

	startRecordOnNewPage(page, pageEvaluateTasks, pageEvaluateData);

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

	const handleBrowserShutdown = async (events, startLink) => {
		let answer = await askQuestion('Start playback? (Y/N) ');
		if (answer != 'Y') {
			console.log(answer);
			return;
		}
		const browser = await puppeteer.launch(configData.browserConfig);
		await browser
			.defaultBrowserContext()
			.overridePermissions(startLink, ['clipboard-read', 'clipboard-write']);
		const page = await browser.newPage();
		await page.setBypassCSP(true);
		await page._client.send('Network.setBypassServiceWorker', { bypass: true });
		page.evaluateOnNewDocument(pagePerformTasks, events);

		try {
			await page.goto(startLink);
		} catch (error) {
			console.log('Error in navigating to given link:', error.message);
			await page.goto('chrome://newtab');
		}
	};

	browser.on('targetcreated', handlePageOpen);
	browser.on('targetdestroyed', handlePageClose);
	browser.on('targetchanged', handleTargetChange);
	browser.on('disconnected', () => {
		handleBrowserShutdown(pageEvents, startLink);
	});
})();
