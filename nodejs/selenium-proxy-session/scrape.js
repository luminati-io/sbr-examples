#!/usr/bin/env node
const { Builder, Browser, By } = require('selenium-webdriver');
const {
    AUTH = 'USER:PASS',
    TARGET_URL = 'https://ifconfig.co/json',
} = process.env;

async function scrape(num, url, sessionId) {
    if (AUTH == 'USER:PASS') {
        throw new Error(`Provide Scraping Browsers credentials in AUTH`
            + ` environment variable or update the script.`);
    }
    console.log(`Scrape ${num}: Connecting to Browser...`);
    const server = `https://${AUTH}@brd.superproxy.io:9515`;
    const driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .usingServer(server)
        .build();
    try {
        console.log(`Scrape ${num}: Connected! Attaching session ${sessionId}...`);
        await driver.sendAndGetDevToolsCommand('Proxy.useSession', { sessionId });
        console.log(`Scrape ${num}: Navigating to ${url}...`);
        await driver.get(url);
        console.log(`Scrape ${num}: Navigated! Scraping data...`);
        const body = await driver.findElement(By.css('body'));
        const data = await body.getText();
        return JSON.parse(data).ip;
    } finally {
        console.log(`Scrape ${num}: Closing browser...`);
        await driver.quit();
    }
}

async function main(url = TARGET_URL) {
    const sessionId = Math.floor(0xFFFFFFFF * Math.random()).toString(16);
    console.log(`Using proxy session: ${sessionId}`);
    const ip1 = await scrape(1, url, sessionId);
    const ip2 = await scrape(2, url, sessionId);
    console.log(`IPs:`, [ip1, ip2]);
    console.log(`Same IP (session persisted)?`, ip1 === ip2);
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
    main().catch(error => {
        console.error(getErrorDetails(error)
            || error.stack
            || error.message
            || error);
        process.exit(1);
    });
}
