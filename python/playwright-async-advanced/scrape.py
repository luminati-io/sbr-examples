#!/usr/bin/env python3
import asyncio
from os import environ
from playwright.async_api import Playwright, async_playwright

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://example.com')


async def scrape(playwright: Playwright, url=TARGET_URL):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH ' +
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    endpoint_url = f'https://{AUTH}@brd.superproxy.io:9222'
    browser = await playwright.chromium.connect_over_cdp(endpoint_url)
    try:
        print('Connected! Starting inspect session...')
        page = await browser.new_page()
        client = await page.context.new_cdp_session(page)
        frames = await client.send('Page.getFrameTree')
        frame_id = frames['frameTree']['frame']['id']
        inspect = await client.send('Page.inspect', {
            'frameId': frame_id,
        })
        inspect_url = inspect['url']
        print(f'You can inspect this session at: {inspect_url}.')
        print('Scraping will continue in 10 seconds...')
        await asyncio.sleep(10)
        print(f'Navigating to {url}...')
        print(f'Connected! Navigating to {url}...')
        await page.goto(url, timeout=2*60_000)
        print('Navigated! Scraping paragraphs...')
        data = await page.eval_on_selector_all(
            'p', 'els => els.map(el => el.innerText)')
        print('Scraped! Data', data)
        print('Session will be closed in 1 minute...')
        await asyncio.sleep(60)
        print('Closing session.')
    finally:
        await browser.close()


async def main():
    async with async_playwright() as playwright:
        await scrape(playwright)


if __name__ == '__main__':
    asyncio.run(main())
