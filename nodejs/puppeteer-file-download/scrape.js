#!/usr/bin/env node
const puppeteer = require('puppeteer-core');
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
    const browserWSEndpoint = `wss://${AUTH}@brd.superproxy.io:9222`;
    const browser = await puppeteer.connect({ browserWSEndpoint });
    try {
        console.log(`Connected! Enable file download...`);
        const page = await browser.newPage();
        const client = await page.createCDPSession();
        await client.send('Download.enable', { allowedContentTypes: ['application/zip'] });
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        console.log(`Navigated! Initiating download...`);
        await Promise.all([
            new Promise(resolve => client.once('Download.downloadRequest', resolve)),
            page.click(selector),
        ]);
        console.log(`Download completed! Saving it to ${filename}...`);
        const { id } = await client.send('Download.getLastCompleted');
        const { body, base64Encoded } = await client.send('Download.getDownloadedBody', { id });
        const bytes = Buffer.from(body, base64Encoded ? 'base64' : 'utf8');
        const file = await fs.open(filename, 'w');
        await file.write(bytes);
        await file.close();
        console.log(`Download saved! Size: ${bytes.length}.`);
    } finally {
        await browser.close();
    }
}

function getErrorDetails(error) {
    if (error.target?._req?.res) {
        const {
            statusCode,
            statusMessage,
        } = error.target._req.res;
        return `Unexpected Server Status ${statusCode}: ${statusMessage}`;
    }
}

if (require.main == module) {
    scrape().catch(error => {
        console.error(getErrorDetails(error)
            || error.stack
            || error.message
            || error);
        process.exit(1);
    });
}

