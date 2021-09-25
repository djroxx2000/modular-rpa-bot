// Runtime Utilities
exports.downloadFile = async (url) => {
	const res = await axios({
		url: url,
		method: 'GET',
		responseType: 'blob',
	});
	// const url = window.URL.createObjectURL(new Blob([response.data]));
	// const link = document.createElement('a');
	// link.href = url;
	// link.setAttribute('download', 'file.pdf'); //or any other extension
	// document.body.appendChild(link);
	// link.click();
	return res.data;
};

exports.registerSW = async () => {
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
};

// TODO: Find correct puppeteer flags to register SW with (headless: false)
window.addEventListener('load', (_) => {
	registerSW();
});

// const initialConfig =
`(async () => {`;
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

const dataDir = __dirname + '/scriptdata';
const downloadDir = __dirname + '/downloaddata';
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, 0744);
}

try {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	await page._client.send('Page.setDownloadBehavior', {
		behavior: 'allow',
		// This path must match the WORKSPACE_DIR in Step 1
		downloadPath: downloadDir,
	});
} catch (error) {
	console.log('Unable to set download directory: ', error.message);
}
const startLink = `dummyStartLinkReference`;
// initialConfig Ends

// const closingConfig =

`})();`;

// closingConfig ends
