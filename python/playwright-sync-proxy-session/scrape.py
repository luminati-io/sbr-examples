#!/usr/bin/env python3
import json
from os import environ
from random import random
from playwright.sync_api import Playwright, sync_playwright

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://ifconfig.co/json')

def scrape(playwright: Playwright, num, url, session_id):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH '
                        'environment variable or update the script.')
    print(f'Scrape {num}: Connecting to Browser...')
    browser_ws_endpoint = f'wss://{AUTH}@brd.superproxy.io:9222'
    browser = playwright.chromium.connect_over_cdp(browser_ws_endpoint)
    try:
        print(f'Scrape {num}: Connected! Attaching session {session_id}...')
        page = browser.new_page()
        client = page.context.new_cdp_session(page)
        client.send('Proxy.useSession', {'sessionId': session_id})
        print(f'Scrape {num}: Navigating to {url}...')
        page.goto(url, timeout=2 * 60 * 1000)
        print(f'Scrape {num}: Navigated! Scraping data...')
        data = page.eval_on_selector('body', 'el => el.innerText')
        return json.loads(data)['ip']
    finally:
        print(f'Scrape {num}: Closing browser...')
        browser.close()


def main(url=TARGET_URL):
    session_id = format(int(0xFFFFFFFF * random()), 'x')
    print(f'Using proxy session: {session_id}')
    with sync_playwright() as playwright:
        ip1 = scrape(playwright, 1, url, session_id)
        ip2 = scrape(playwright, 2, url, session_id)
    print('IPs:', [ip1, ip2])
    print('Same IP (session persisted)?', ip1 == ip2)


if __name__ == '__main__':
    main()
