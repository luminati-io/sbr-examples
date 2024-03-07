#!/usr/bin/env node
const puppeteer = require('puppeteer-core');
const {
    AUTH = 'USER:PASS',
    TARGET_URL = 'https://example.com',
} = process.env;

async function scrape(url = TARGET_URL) {
    if (AUTH == 'USER:PASS') {
        throw new Error(`Provide Scraping Browsers credentials in AUTH`
            + ` environment variable or update the script.`);
    }
    console.log(`Connecting to Browser...`);
    const browserWSEndpoint = `wss://${AUTH}@brd.superproxy.io:9222`;
    const browser = await puppeteer.connect({ browserWSEndpoint });
    try {
        console.log(`Connected! Starting inspect session...`);
        const page = await browser.newPage();
        const client = await page.createCDPSession();
        const { frameTree: { frame } } = await client.send('Page.getFrameTree');
        const { url: inspectUrl } = await client.send('Page.inspect', {
            frameId: frame.id,
        });
        console.log(`You can inspect this session at: ${inspectUrl}.`);
        console.log(`Scraping will continue in 10 seconds...`);
        await sleep(10);
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        console.log(`Navigated! Scraping paragraphs...`);
        const data = await page.$$eval('p', els => els.map(el => el.innerText));
        console.log(`Scraped! Data:`, data);
        console.log(`Session will be closed in 1 minute...`);
        await sleep(60);
    } finally {
        console.log(`Closing session.`);
        await browser.close();
    }
}

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
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

