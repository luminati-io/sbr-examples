#!/usr/bin/env node
const playwright = require('playwright');
const {
    AUTH = 'USER:PASS',
    TARGET_URL = 'https://geo.brdtest.com/mygeo.json',
    LOCATION = 'amsterdam',
} = process.env;

const LOCATIONS = Object.freeze({
    amsterdam: { lat: 52.377956, lon: 4.897070 },
    london: { lat: 51.509865, lon: -0.118092 },
    new_york: { lat: 40.730610, lon: -73.935242 },
    paris: { lat: 48.864716, lon: 2.349014 },
});

async function scrape(url = TARGET_URL, location = LOCATION) {
    if (AUTH == 'USER:PASS') {
        throw new Error(`Provide Scraping Browsers credentials in AUTH`
            + ` environment variable or update the script.`);
    }
    if (!LOCATIONS[location]) {
        throw new Error(`Unknown location`);
    }
    const { lat, lon } = LOCATIONS[location];
    console.log(`Connecting to Browser...`);
    const endpointURL = `wss://${AUTH}@brd.superproxy.io:9222`;
    const browser = await playwright.chromium.connectOverCDP(endpointURL);
    try {
        console.log(`Connected! Changing proxy location`
            + ` to ${location} (${lat}, ${lon})...`);
        const page = await browser.newPage();
        const client = await page.context().newCDPSession(page);
        await client.send('Proxy.setLocation', {
            lat, lon,
            distance: 50 /* kilometers */,
        });
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { timeout: 2 * 60 * 1000 });
        console.log(`Navigated! Scraping data...`);
        const data = await page.$eval('body', el => el.innerText);
        console.log(`Scraped! Data:`, JSON.parse(data));
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

