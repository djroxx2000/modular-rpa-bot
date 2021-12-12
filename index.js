const puppeteer = require('puppeteer');
const { evalFunctions } = require('./utility/eventhandlers')
const {
	handleBrowserShutdown,
	askQuestion,
	validateLink,
	initAndGetConfigs,
	exposePageFunction,
	networkRequest,
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

	const eventLog = { eventList: [], reqList: [] };
	await exposePageFunction(page, eventLog);

	await page.evaluateOnNewDocument(
		(data) => {
			console.log(data);
			const types = data.types;
			const createEventObject = eval(data.evalFunctions.createEventObject);
			const addClipboardEventFields = eval(data.evalFunctions.addClipboardEventFields);
			const addPointerEventFields = eval(data.evalFunctions.addPointerEventFields);
			const handleFormClick = eval(data.evalFunctions.handleFormClick);
			const handleInput = eval(data.evalFunctions.handleInput);
			const handleSelect = eval(data.evalFunctions.handleSelect);
			const getPathFromRoot = eval(data.evalFunctions.getPathFromRoot);

			const getSelector = function(el, names) {
				if (el === document || el === document.documentElement) return "document";
				if (el === document.body) return "body";
				if (typeof names === "undefined") var names = [];
				if (el.id) {
					names.unshift('#'+el.id);
					return names.join(" > ");
				} else if (el.className) {
					var arrNode = [].slice.call(el.parentNode.getElementsByClassName(el.className));
					var classSelector = el.className.split(" ").join(".");
					if (arrNode.length == 1) {
						names.unshift(el.tagName.toLowerCase()+"."+classSelector);
					} else {
						for (var c=1,e=el;e.previousElementSibling;e=e.previousElementSibling,c++); 
						names.unshift(el.tagName.toLowerCase()+":nth-child("+c+")");
					}
				} else {
					for (var c=1,e=el;e.previousElementSibling;e=e.previousElementSibling,c++); 
					names.unshift(el.tagName.toLowerCase()+":nth-child("+c+")");
				}
				
				if (el.parentNode !== document.body) {
					getSelector(el.parentNode, names) 
				}
				return names.join(" > ");
			};

			for (let type of types) {
				window.addEventListener(type, async (e) => {
					console.log(e);
					let out = await createEventObject(e, type);
					if (out == null) {
						return;
					}
					window.userAction(out);
				});
			}
		},
		{
			serviceWorkerPath: configData.serviceWorkerPath,
			types: configData.eventTypes,
			evalFunctions
		} // TODO: Make customizable via console
	);
	try {
		await page.goto(startLink);	
	} catch (error) {
		console.log("Error in navigating to given link:", error.message);
		await page.goto('chrome://newtab')
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

	// TODO: Discard irrelevant requests
	page.on('request', (evObject) => networkRequest(evObject, page, eventLog));

	browser.on('targetcreated', handlePageOpen);
	browser.on('targetdestroyed', handlePageClose);
	browser.on('targetchanged', handleTargetChange);
	browser.on('disconnected', () => {
		handleBrowserShutdown(eventLog);
	});
})();
