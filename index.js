const puppeteer = require('puppeteer');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const dir = __dirname + '/userdata';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, 0744);
}

const startLink = "https://google.co.in";

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: dir
    });
    const page = await browser.newPage();
    // const client = page._client;
    await page.exposeFunction('documentClick', (e) => {
        console.log(e);
    });
    await page.evaluateOnNewDocument((type) => {
        function createClickObject(event) {
            let clickObject = {};
            clickObject.coordinates = [event.clientX, event.clientY];
            clickObject.targetElement = {};
            clickObject.targetElement.classes = event.target.getAttribute('class');
            clickObject.targetElement.ids = event.target.getAttribute('id');
            clickObject.targetElement.tag = event.target.tagName;
            return clickObject;
        }
        window.addEventListener(type, (e) => {
            console.log(e.target.tagName);
            let out = createClickObject(e);
            window.documentClick(out);
        })
    }, 'click');
    await page.goto(startLink);
})();
