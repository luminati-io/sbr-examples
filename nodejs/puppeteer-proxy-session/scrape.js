#!/usr/bin/env node
const puppeteer = require('puppeteer-core');
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
    const browserWSEndpoint = `wss://${AUTH}@brd.superproxy.io:9222`;
    const browser = await puppeteer.connect({ browserWSEndpoint });
    try {
        console.log(`Scrape ${num}: Connected! Attaching session ${sessionId}...`);
        const page = await browser.newPage();
        const client = await page.createCDPSession();
        await client.send('Proxy.useSession', { sessionId });
        console.log(`Scrape ${num}: Navigating to ${url}...`);
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        console.log(`Scrape ${num}: Navigated! Scraping data...`);
        const data = await page.$eval('body', el => el.innerText);
        return JSON.parse(data).ip;
    } finally {
        console.log(`Scrape ${num}: Closing browser...`);
        await browser.close();
    }
}

async function main(url = TARGET_URL) {
    const sessionId = Math.floor(0xFFFFFFFF*Math.random()).toString(16);
    console.log(`Using proxy session: ${sessionId}`);
    const ip1 = await scrape(1, url, sessionId);
    const ip2 = await scrape(2, url, sessionId);
    console.log(`IPs:`, [ip1, ip2]);
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

