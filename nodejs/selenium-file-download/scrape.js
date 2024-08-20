#!/usr/bin/env node
const { Builder, Browser, By, Condition } = require('selenium-webdriver');
const fs = require('fs/promises');
const {
    AUTH = 'USER:PASS',
    TARGET_URL = 'https://myjob.page/tools/test-files',
    SELECTOR = 'a[role=button]',
    FILENAME = './testfile.zip',
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
        await cdp('Download.enable', { allowedContentTypes: ['application/zip'] });
        console.log(`Navigating to ${url}...`);
        await driver.get(url);
        console.log(`Navigated! Initiating download...`)
        const initiator = await driver.findElement(By.css(selector));
        await initiator.click();
        const id = await driver.wait(new Condition('Waiting download completed', async () => {
            const last = await cdp('Download.getLastCompleted');
            return last.id;
        }));
        console.log(`Download completed! Saving it to ${filename}...`);
        const { body, base64Encoded } = await cdp('Download.getDownloadedBody', { requestId: id });
        const bytes = Buffer.from(body, base64Encoded ? 'base64' : 'utf8');
        const file = await fs.open(filename, 'w');
        await file.write(bytes);
        await file.close();
        console.log(`Download saved! Size: ${bytes.length}.`);
    } finally {
        console.log(`Closing session.`);
        await driver.quit();
    }
}

if (require.main == module) {
    scrape().catch(error => {
        console.error(error.stack || error.message || error);
        process.exit(1);
    });
}

