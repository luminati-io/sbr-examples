#!/usr/bin/env python3
from os import environ
from selenium.webdriver import Remote, ChromeOptions as Options
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection as Connection

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://example.com')


def scrape(url=TARGET_URL):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH ' +
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    server_addr = f'https://{AUTH}@brd.superproxy.io:9515'
    connection = Connection(server_addr, 'goog', 'chrome')
    with Remote(connection, options=Options()) as driver:
        print(f'Connected! Navigating to {url}...')
        driver.get(url)
        print('Navigated! Scraping page content...')
        data = driver.page_source
        print(f'Scraped! Data: {data}')


if __name__ == '__main__':
    scrape()
