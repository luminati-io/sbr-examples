#!/usr/bin/env python3
from os import environ
from time import time
from playwright.sync_api import sync_playwright

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://www.w3schools.com/js/js_dates.asp')
AD_BLOCK = environ.get('AD_BLOCK', default='1')

def scrape(url=TARGET_URL):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH '
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    browser_ws_endpoint = f'wss://{AUTH}@brd.superproxy.io:9222'
    with sync_playwright() as playwright:
        browser = playwright.chromium.connect_over_cdp(browser_ws_endpoint)
        try:
            begin = time()
            print('Connected!')
            page = browser.new_page()
            client = page.context.new_cdp_session(page)
            result = client.send('Browser.getSessionId')
            session_id = result['sessionId']
            print('Current session ID:', session_id)
            if AD_BLOCK == '1':
                print('Enabling AdBlock...')
                client = page.context.new_cdp_session(page)
                client.send('Unblocker.enableAdBlock')
                print('Enabled!')
            print(f'Navigating to {url}...')
            page.goto(url, timeout=2 * 60 * 1000)

            data = page.content()
            elapsed = time() - begin
            print(f'Done! Time: {elapsed}')
            return data

        finally:
            browser.close()


if __name__ == '__main__':
    scrape()
