#!/usr/bin/env node
const puppeteer = require('puppeteer-core');
const {
    AUTH = 'USER:PASS',
    TARGET_URL = 'https://www.w3schools.com/js/js_dates.asp',
    AD_BLOCK = '1',
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
        const begin = Date.now();
        console.log(`Connected!`);
        const page = await browser.newPage();
        if (AD_BLOCK == '1') {
            console.log(`Enabling AdBlock...`);
            const client = await page.createCDPSession();
            await client.send('Unblocker.enableAdBlock');
            console.log(`Enabled!`);
        }
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        const data = await page.content();
        const time = Date.now() - begin;
        console.log(`Done! Time: ${time}`);
        return data;
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

