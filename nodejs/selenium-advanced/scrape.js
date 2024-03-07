#!/usr/bin/env node
const { Builder, Browser, By } = require('selenium-webdriver');
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
    const cdp = (name, params = {}) => driver.sendAndGetDevToolsCommand(name, params);
    try {
        console.log(`Connected! Starting inspect session...`);
        const { frameTree: { frame } } = await cdp('Page.getFrameTree');
        const { url: inspectUrl } = await cdp('Page.inspect', {
            frameId: frame.id,
        });
        console.log(`You can inspect this session at: ${inspectUrl}.`);
        console.log(`Scraping will continue in 10 seconds...`);
        await sleep(10);
        console.log(`Navigating to ${url}...`);
        await driver.get(url);
        console.log(`Navigated! Scraping paragraphs...`);
        const paragraphs = await driver.findElements(By.css('p'));
        const data = await driver.executeScript(els => els.map(el => el.innerText), paragraphs);
        console.log(`Scraped! Data:`, data);
        console.log(`Session will be closed in 1 minute...`);
        await sleep(60);
    } finally {
        console.log(`Closing session.`);
        await driver.quit();
    }
}

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

if (require.main == module) {
    scrape().catch(error => {
        console.error(error.stack || error.message || error);
        process.exit(1);
    });
}

