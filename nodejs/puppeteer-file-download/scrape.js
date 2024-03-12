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
        console.log(`Connected! Navigating to ${url}...`);
        const page = await browser.newPage();
        const client = await page.createCDPSession();
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        console.log(`Navigated! Initiating download...`);
        const requestId = await initiateDownload(page, client, selector);
        console.log(`Download started! Stream it to ${filename}...`);
        const { stream } = await client.send('Fetch.takeResponseBodyAsStream', {
            requestId,
        });
        const file = await fs.open(filename, 'w');
        let fileSize = 0;
        while (true) {
            const { data, base64Encoded, eof } = await client.send('IO.read', {
                handle: stream,
            });
            const chunk = Buffer.from(data, base64Encoded ? 'base64' : 'utf8');
            await file.write(chunk);
            fileSize += chunk.byteLength;
            if (eof) {
                break;
            }
        }
        await file.close();
        console.log(`Download saved! Size: ${fileSize}.`);
    } finally {
        await browser.close();
    }
}

async function initiateDownload(page, client, selector) {
    await client.send('Fetch.enable', {
        patterns: [{
            requestStage: 'Response',
            resourceType: 'Document',
        }],
    });
    return await new Promise((resolve, reject) => {
        client.on('Fetch.requestPaused', ({ requestId }) => {
            resolve(requestId);
        });
        page.click(selector).catch(error => {
            reject(error);
        });
    });
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

