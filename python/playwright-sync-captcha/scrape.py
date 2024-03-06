#!/usr/bin/env python3
from os import environ
from playwright.sync_api import Playwright, sync_playwright

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://example.com')


def scrape(playwright: Playwright, url=TARGET_URL):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH ' +
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    endpoint_url = f'wss://{AUTH}@brd.superproxy.io:9222'
    browser = playwright.chromium.connect_over_cdp(endpoint_url)
    try:
        print(f'Connected! Navigating to {url}...')
        page = browser.new_page()
        client = page.context.new_cdp_session(page)
        page.goto(url, timeout=2*60_000)
        print('Navigated! Waiting captcha to detect and solve...')
        result = client.send('Captcha.waitForSolve', {
            'detectTimeout': 10 * 1000,
        })
        status = result['status']
        print(f'Captcha status: {status}')
    finally:
        browser.close()


def main():
    with sync_playwright() as playwright:
        scrape(playwright)


if __name__ == '__main__':
    main()
