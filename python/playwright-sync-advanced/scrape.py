#!/usr/bin/env python3
from os import environ
from time import sleep
from playwright.sync_api import Playwright, sync_playwright

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://example.com')


def scrape(playwright: Playwright, url=TARGET_URL):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH '
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    endpoint_url = f'wss://{AUTH}@brd.superproxy.io:9222'
    browser = playwright.chromium.connect_over_cdp(endpoint_url)
    try:
        print('Connected! Starting inspect session...')
        page = browser.new_page()
        client = page.context.new_cdp_session(page)
        frames = client.send('Page.getFrameTree')
        frame_id = frames['frameTree']['frame']['id']
        inspect = client.send('Page.inspect', {
            'frameId': frame_id,
        })
        inspect_url = inspect['url']
        print(f'You can inspect this session at: {inspect_url}.')
        print('Scraping will continue in 10 seconds...')
        sleep(10)
        print(f'Navigating to {url}...')
        page.goto(url, timeout=2*60_000)
        print('Navigated! Scraping paragraphs...')
        data = page.eval_on_selector_all(
            'p', 'els => els.map(el => el.innerText)')
        print('Scraped! Data', data)
        print('Session will be closed in 1 minute...')
        sleep(60)
    finally:
        print('Closing session.')
        browser.close()


def main():
    with sync_playwright() as playwright:
        scrape(playwright)


if __name__ == '__main__':
    main()
