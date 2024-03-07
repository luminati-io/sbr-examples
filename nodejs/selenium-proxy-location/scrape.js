#!/usr/bin/env node
const { Builder, Browser, By } = require('selenium-webdriver');
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
    const server = `https://${AUTH}@brd.superproxy.io:9515`;
    const driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .usingServer(server)
        .build();
    try {
        console.log(`Connected! Changing proxy location`
            + ` to ${location} (${lat}, ${lon})...`);
        await driver.sendAndGetDevToolsCommand('Proxy.setLocation', {
            lat, lon,
            distance: 50 /* kilometers */,
        });
        console.log(`Navigating to ${url}...`);
        await driver.get(url);
        console.log(`Navigated! Scraping data...`);
        const body = await driver.findElement(By.css('body'));
        const data = await body.getText();
        console.log(`Scraped! Data:`, JSON.parse(data));
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

