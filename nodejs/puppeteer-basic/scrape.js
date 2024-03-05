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
    const browserWSEndpoint = `https://${AUTH}@brd.superproxy.io:9222`;
    const browser = await puppeteer.connect({ browserWSEndpoint });
    try {
        console.log(`Connected! Navigating to ${url}...`);
        const page = await browser.newPage();
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        console.log(`Navigated! Scraping page content...`);
        const data = await page.content();
        console.log(`Scraped! Data: ${data}`);
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

