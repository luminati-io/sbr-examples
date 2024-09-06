#!/usr/bin/env python3
import asyncio
from os import environ
from playwright.async_api import Playwright, async_playwright

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://example.com')


async def scrape(playwright: Playwright, url=TARGET_URL):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH '
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    endpoint_url = f'wss://{AUTH}@brd.superproxy.io:9222'
    browser = await playwright.chromium.connect_over_cdp(endpoint_url)
    try:
        print(f'Connected! Navigating to {url}...')
        page = await browser.new_page()
        await page.goto(url, timeout=2*60_000)
        print('Navigated! Scraping page content...')
        data = await page.content()
        print(f'Scraped! Data: {data}')
    finally:
        await browser.close()


async def main():
    async with async_playwright() as playwright:
        await scrape(playwright)


if __name__ == '__main__':
    asyncio.run(main())
