#!/usr/bin/env node
const puppeteer = require('puppeteer-core');
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
    const browserWSEndpoint = `wss://${AUTH}@brd.superproxy.io:9222`;
    const browser = await puppeteer.connect({ browserWSEndpoint });
    try {
        console.log(`Connected! Enable file download...`);
        const page = await browser.newPage();
        const client = await page.createCDPSession();
        await client.send('Download.enable', { allowedContentTypes: ['application/octet-stream'] });
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        console.log(`Navigated! Initiating download...`);
        await Promise.all([
            new Promise(resolve => client.once('Download.downloadRequest', resolve)),
            page.click(selector),
        ]);
        console.log(`Download completed! Saving it to ${filename}...`);
        const { id } = await client.send('Download.getLastCompleted');
        const body = await getDownloadedBody(client, id);
        const file = await fs.open(filename, 'w');
        await file.write(body);
        await file.close();
        console.log(`Download saved! Size: ${body.length}.`);
    } finally {
        await browser.close();
    }
}

async function getDownloadedBody(client, id, chunkSize = +CHUNK_SIZE){
    let offset = 0;
    const parts = [];
    for (let i = 1;; i++) {
        const { body, base64Encoded, eof } =
            await client.send('Download.getDownloadedBody', { id, offset, size: chunkSize });
        const chunk = Buffer.from(body, base64Encoded ? 'base64' : 'utf8');
        console.log(`Download chunk #${i}! Size: ${chunk.length}`);
        parts.push(chunk);
        offset += chunk.length;
        if (eof) {
            return Buffer.concat(parts)
        }
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

