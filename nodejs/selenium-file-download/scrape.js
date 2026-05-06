#!/usr/bin/env node
const { Builder, Browser, By, Condition } = require('selenium-webdriver');
const fs = require('fs/promises');
const {
    AUTH = 'USER:PASS',
    TARGET_URL = 'https://calmcode.io/datasets/bigmac',
    SELECTOR = 'button.border',
    FILENAME = './testfile.csv',
    CHUNK_SIZE = '1048576',
} = process.env;

async function scrape(url = TARGET_URL, selector = SELECTOR, filename = FILENAME) {
    if (AUTH == 'USER:PASS') {
        throw new Error(`Provide Scraping Browsers credentials in AUTH`
            + ` environment variable or update the script.`);
    }
    console.log(`Connecting to Browser...`);
    const server = `https://${AUTH}@brd.superproxy.io:9515`;
    const driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .usingServer(server)
        .build();
    const cdp = (name, params = {}) => driver.sendAndGetDevToolsCommand(name, params);
    try {
        console.log(`Connected! Enable file download...`);
        await cdp('Download.enable', { allowedContentTypes: ['application/octet-stream'] });
        console.log(`Navigating to ${url}...`);
        await driver.get(url);
        console.log(`Navigated! Initiating download...`);
        const initiator = await driver.findElement(By.css(selector));
        await initiator.click();
        const id = await driver.wait(new Condition('Waiting download completed', async () => {
            const last = await cdp('Download.getLastCompleted');
            return last.id;
        }));
        console.log(`Download completed! Saving it to ${filename}...`);
        const body = await getDownloadedBody(cdp, id);
        const file = await fs.open(filename, 'w');
        await file.write(body);
        await file.close();
        console.log(`Download saved! Size: ${body.length}.`);
    } finally {
        console.log(`Closing session.`);
        await driver.quit();
    }
}

async function getDownloadedBody(cdp, id, chunkSize = +CHUNK_SIZE) {
    let offset = 0;
    const parts = [];
    for (let i = 1;; i++) {
        const { body, base64Encoded, eof } =
            await cdp('Download.getDownloadedBody', { id, offset, size: chunkSize });
        const chunk = Buffer.from(body, base64Encoded ? 'base64' : 'utf8');
        console.log(`Download chunk #${i}! Size: ${chunk.length}`);
        parts.push(chunk);
        offset += chunk.length;
        if (eof) {
            return Buffer.concat(parts);
        }
    }
}

if (require.main == module) {
    scrape().catch(error => {
        console.error(error.stack || error.message || error);
        process.exit(1);
    });
}

