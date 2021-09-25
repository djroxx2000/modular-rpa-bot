const puppeteer = require('puppeteer');
const {
	handleBrowserShutdown,
	askQuestion,
	validateLink,
	initAndGetConfigs,
	getPageId,
	exposePageFunction,
	networkRequest,
} = require('./utility/utility');

(async () => {
	// TODO: Take more relevant console input before launching browser
	const configData = initAndGetConfigs();
	let answer = await askQuestion('Starting point (URL): ');
	validateLink(answer);
	startLink = answer;

	const browser = await puppeteer.launch(configData.browserConfig);
	await browser
		.defaultBrowserContext()
		.overridePermissions(startLink, ['clipboard-read', 'clipboard-write']);
	const page = await browser.newPage();
	await page._client.send('Network.setBypassServiceWorker', { bypass: true });

	const pageEvents = {};
	await exposePageFunction(page, pageEvents);

	await page.evaluateOnNewDocument(
		(data) => {
			const types = data.types;

			function handleInput(e, eventObject) {
				console.log('handling input');
				if (e.target.value !== '') {
					eventObject.isForm = true;
					eventObject.inputValue = e.target.value;
					// e.target.removeAllListeners('focusout');
					window.documentClick(eventObject);
				}
			}

			function handleSelect(e, eventObject) {
				// TODO: Handle select tags
				e.target.removeAllListeners('focusout');
			}

			function addPointerEventFields(pointerObj, event) {
				pointerObj.coordinates = [event.clientX, event.clientY];
				return pointerObj;
			}

			async function addClipboardEventFields(clipboardObj) {
				return new Promise(async (resolve) => {
					let data = await navigator.clipboard.readText();
					resolve(data);
				}).then((textData) => {
					clipboardObj.clipboardData = textData;
					return clipboardObj;
				});
			}

			function checkFormClick(eventObject, event, type) {
				if (type !== 'click') {
					return eventObject;
				}
				if (event.target.tagName == 'INPUT') {
					console.log('input');
					event.target.addEventListener('focusout', (e) => {
						console.log('focusout');
						handleInput(e, eventObject);
					});
					return;
				}
				if (event.target.tagName == 'select') {
					event.target.addEventListener('focusout', (e) => {
						handleSelect(e, eventObject);
					});
					return;
				}
				return eventObject;
			}

			async function createEventObject(event, type) {
				eventObject = {};
				eventObject.eventType = type;
				eventObject.location = window.location.href;
				eventObject.targetElement = {};
				eventObject.targetElement.classes = event.target.getAttribute('class');
				eventObject.targetElement.ids = event.target.getAttribute('id');
				eventObject.targetElement.tag = event.target.tagName;
				switch (type) {
					case 'click':
						eventObject = addPointerEventFields(eventObject, event);
						eventObject = checkFormClick(eventObject, event, type);
						if (eventObject == null) {
							return;
						}
						break;
					case 'contextmenu':
						eventObject = addPointerEventFields(eventObject, event);
						break;
					case 'copy':
						eventObject = await addClipboardEventFields(eventObject);
						break;
				}
				return eventObject;
			}
			for (let type of types) {
				window.addEventListener(type, async (e) => {
					console.log(e);
					let out = await createEventObject(e, type);
					if (out == null) {
						return;
					}
					window.documentClick(out);
				});
			}
		},
		{
			serviceWorkerPath: configData.serviceWorkerPath,
			types: configData.eventTypes,
		} // TODO: Make customizable via console
	);
	await page.goto(startLink);

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

	// TODO: Discard irrelevant requests
	page.on('request', (evObject) => networkRequest(evObject, page, pageEvents));

	browser.on('targetcreated', handlePageOpen);
	browser.on('targetdestroyed', handlePageClose);
	browser.on('targetchanged', handleTargetChange);
	browser.on('disconnected', () => {
		handleBrowserShutdown(pageEvents);
	});
})();
