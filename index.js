const puppeteer = require('puppeteer');
const fs = require('fs');

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
            clickObject.targetElement.id = event.target.getAttribute('id');
            clickObject.targetElement.tag = event.target.tagName;
            return clickObject;
        }

        function pathFromRoot(uid, node, key) {
            // BFS from root - take each child - 0, 1, 2,... children.length & generated unique string
            // UID will be seperated by #, so split on # to unfold

            if(node.children.length) {
                const children = [...node.children];
                for(var i = 0; i < children.length; i++){
                    const child = children[i];
                    node = child;
                    uid += `${i}#`;
                    if(child === key) {
                        return {uid, found: true};
                    }
                    _pathFromRoot = pathFromRoot(uid, node, key);
                    // If key is found return uid object
                    if(_pathFromRoot.found) return _pathFromRoot;
                    else uid = _pathFromRoot.uid;
                }
            }

            // Reached leaf node of 1 branch without finding key
            tokens = uid.split("#");
            // Remove second last index - coz last val in split is "" by default
            if(tokens.length) {
                tokens.splice(tokens.length - 2, 1);
            } else {
                throw new Error("Error building UUID");
            }

            returnVal = tokens.join("#");

            return {uid: returnVal, found: false};
        }

        window.addEventListener(type, (e) => {
            console.log(e.target.tagName);
            let out = createClickObject(e);
            window.documentClick(out);
            const _pathFromRoot = pathFromRoot("", document.documentElement, e.target);
            console.log(_pathFromRoot);
        });
    }, 'click');
    await page.goto(startLink);
})();
