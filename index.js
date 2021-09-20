(async () => {
	const puppeteer = require('puppeteer');
	const fs = require('fs');
	const path = require('path');

	// TODO: Take more relevant console input before launching browser
	const readline = require('readline');
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	let startLink = null;
	rl.question('Starting point for logging (url): ', (answer) => {
		let isValid = answer.match(
			'(http(s)?://.)?(www.)?[-a-zA-Z0-9@:%._+~#=]{2,256}.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&=]*)'
		);
		if (isValid) {
			startLink = answer;
		}
	});

	const dir = __dirname + '/userdata';
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, 0744);
	}
	const serviceWorkerPath = path.resolve('./service-worker.js');

	const browser = await puppeteer.launch({
		headless: false,
		userDataDir: dir,
		args: ['--enable-features=NetworkService'],
		ignoreHTTPSErrors: true,
	});
	const context = browser.defaultBrowserContext();
	await context.overridePermissions(startLink, ['clipboard-read', 'clipboard-write']);
	const page = await browser.newPage();
	const client = page._client;
	client.send('Network.setBypassServiceWorker', { bypass: true });
	await page.exposeFunction('documentClick', (e) => {
		console.log(e);
	});

	const browserData = {
		serviceWorkerPath: serviceWorkerPath,
		types: ['click', 'contextmenu', 'copy'],
	};
	await page.evaluateOnNewDocument(
		(data) => {
			const types = data.types;
			async function registerSW() {
				if (navigator && 'serviceWorker' in navigator) {
					try {
						await navigator.serviceWorker.register(data.serviceWorkerPath);
					} catch (e) {
						console.log(e);
						alert('ServiceWorker registration failed! No offline support available');
					}
				} else {
					console.log('No service worker API available');
				}
			}

			function addPointerEventFields(pointerObj, event) {
				pointerObj.coordinates = [event.clientX, event.clientY];
				return pointerObj;
			}

			function addClipboardEventFields(clipboardObj) {
				clipboardObj.clipboardData = navigator.clipboard.readText();
				return clipboardObj;
			}

			function createEventObject(event, type) {
				var eventObject = {};
				eventObject.eventType = type;
				eventObject.location = window.location.href;
				eventObject.targetElement = {};
				eventObject.targetElement.classes = event.target.getAttribute('class');
				eventObject.targetElement.ids = event.target.getAttribute('id');
				eventObject.targetElement.tag = event.target.tagName;
				switch (type) {
					case 'click':
					case 'contextmenu':
						eventObject = addPointerEventFields(eventObject, event);
						break;
					case 'copy':
						eventObject = addClipboardEventFields(eventObject);
						break;
				}
				return eventObject;
			}

			for (let type of types) {
				window.addEventListener(type, async (e) => {
					console.log(e);
					let out = createEventObject(e, type);
					window.documentClick(out);
				});
			}

			// TODO: Find correct puppeteer flags to register SW with (headless: false)
			// window.addEventListener('load', (_) => {
			// 	registerSW();
			// });
		},
		browserData // Make customizable via console
	);
	// TODO: Discard irrelevant requests
	page.on('request', (e) => {
		console.log(e.url(), '\n\n\n');
	});
	await page.goto(startLink);
})();
