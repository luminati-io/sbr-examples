#!/usr/bin/env python3
import json
from os import environ
from selenium.webdriver import Remote, ChromeOptions as Options
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection as Connection
from selenium.webdriver.common.by import By

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


def scrape(url=TARGET_URL, location=LOCATION):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH ' +
                        'environment variable or update the script.')
    if location not in LOCATIONS:
        raise Exception('Unknown location')
    lat, lon = LOCATIONS[location]
    print('Connecting to Browser...')
    server_addr = f'https://{AUTH}@brd.superproxy.io:9515'
    connection = Connection(server_addr, 'goog', 'chrome')
    driver = Remote(connection, options=Options())
    try:
        print('Connected! Changing proxy location'
              + f'to {location} ({lat}, {lon})...')
        driver.execute('executeCdpCommand', {
            'cmd': 'Proxy.setLocation',
            'params': {
                'lat': lat, 'lon': lon,
                'distance': 50  # kilometers
            },
        })
        print(f'Navigating to {url}...')
        driver.get(url)
        print('Navigated! Scraping data...')
        body = driver.find_element(By.CSS_SELECTOR, 'body')
        data = body.text
        print(f'Scraped! Data: {json.loads(data)}')
    finally:
        driver.quit()


if __name__ == '__main__':
    scrape()
