#!/usr/bin/env python3
import json
from os import environ
from playwright.sync_api import Playwright, sync_playwright

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL',
                         default='https://geo.brdtest.com/mygeo.json')
LOCATION = environ.get('LOCATION', default='amsterdam')
LOCATIONS = {
    'amsterdam': (52.377956, 4.897070),
    'london': (51.509865, -0.118092),
    'new_york': (40.730610, -73.935242),
    'paris': (48.864716, 2.349014),
}


def scrape(playwright: Playwright, url=TARGET_URL, location=LOCATION):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH '
                        'environment variable or update the script.')
    if location not in LOCATIONS:
        raise Exception('Unknown location')
    lat, lon = LOCATIONS[location]
    print('Connecting to Browser...')
    endpoint_url = f'wss://{AUTH}@brd.superproxy.io:9222'
    browser = playwright.chromium.connect_over_cdp(endpoint_url)
    try:
        print('Connected! Changing proxy location'
              + f'to {location} ({lat}, {lon})...')
        page = browser.new_page()
        client = page.context.new_cdp_session(page)
        client.send('Proxy.setLocation', {
            'lat': lat, 'lon': lon,
            'distance': 50  # kilometers
        })
        print(f'Navigating to {url}...')
        page.goto(url, timeout=2*60_000)
        print('Navigated! Scraping data...')
        data = page.eval_on_selector('body', 'el => el.innerText')
        print(f'Scraped! Data: {json.loads(data)}')
    finally:
        browser.close()


def main():
    with sync_playwright() as playwright:
        scrape(playwright)


if __name__ == '__main__':
    main()
