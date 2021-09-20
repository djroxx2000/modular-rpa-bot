// Utilities
const downloadFile = async (url) => {
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

// const downloadFileFromLink =

// const closingConfig =

`})();`;

// closingConfig ends

module.exports = downloadFile;
