#!/usr/bin/env node
const playwright = require('playwright');
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
    const endpointURL = `https://${AUTH}@brd.superproxy.io:9222`;
    const browser = await playwright.chromium.connectOverCDP(endpointURL);
    try {
        console.log(`Connected! Navigating to ${url}...`);
        const page = await browser.newPage();
        const client = await page.context().newCDPSession(page);
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        console.log(`Navigated! Waiting captcha to detect and solve...`);
        const { status } = await client.send('Captcha.waitForSolve', {
            detectTimeout: 10 * 1000,
        });
        console.log(`Captcha status: ${status}`);
    } finally {
        await browser.close();
    }
}

if (require.main == module) {
    scrape().catch(error => {
        console.error(error.stack || error.message || error);
        process.exit(1);
    });
}

