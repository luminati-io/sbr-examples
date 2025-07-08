#!/usr/bin/env node
const { Builder, Browser } = require('selenium-webdriver');
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
    const server = `https://${AUTH}@brd.superproxy.io:9515`;
    const driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .usingServer(server)
        .build();
    try {
        console.log(`Connected! Navigating to ${url}...`);
        await driver.get(url);
        console.log(`Navigated! Waiting captcha to detect and solve...`);
        const { status } = await driver.sendAndGetDevToolsCommand('Captcha.waitForSolve', {
            detectTimeout: 10 * 1000,
        });
        console.log(`Captcha status: ${status}`);
    } finally {
        await driver.quit();
    }
}

if (require.main == module) {
    scrape().catch(error => {
        console.error(error.stack || error.message || error);
        process.exit(1);
    });
}

