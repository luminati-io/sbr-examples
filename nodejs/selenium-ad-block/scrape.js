#!/usr/bin/env node
const { Builder, Browser } = require('selenium-webdriver');
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
    const server = `https://${AUTH}@brd.superproxy.io:9515`;
    const driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .usingServer(server)
        .build();
    try {
        const begin = Date.now();
        console.log(`Connected!`);
        const result = await driver.sendAndGetDevToolsCommand('Browser.getSessionId');
        const sessionId = result.sessionId;
        console.log('Current session ID:', sessionId);
        if (AD_BLOCK == '1') {
            console.log(`Enabling AdBlock...`);
            await driver.sendAndGetDevToolsCommand('Unblocker.enableAdBlock');
            console.log(`Enabled!`);
        }
        console.log(`Navigating to ${url}...`);
        await driver.get(url);

        const data = await driver.getPageSource();
        const time = Date.now() - begin;
        console.log(`Done! Time: ${time}`);
        return data;

    } finally {
        await driver.quit();
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
