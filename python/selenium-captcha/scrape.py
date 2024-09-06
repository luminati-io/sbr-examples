#!/usr/bin/env python3
from os import environ
from selenium.webdriver import Remote, ChromeOptions as Options
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection as Connection

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://example.com')


def scrape(url=TARGET_URL):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH '
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    server_addr = f'https://{AUTH}@brd.superproxy.io:9515'
    connection = Connection(server_addr, 'goog', 'chrome')
    driver = Remote(connection, options=Options())
    try:
        print(f'Connected! Navigating to {url}...')
        driver.get(url)
        print('Navigated! Waiting captcha to detect and solve...')
        result = driver.execute('executeCdpCommand', {
            'cmd': 'Captcha.waitForSolve',
            'params': {'detectTimeout': 10 * 1000},
        })
        status = result['value']['status']
        print(f'Captcha status: {status}')
    finally:
        driver.quit()


if __name__ == '__main__':
    scrape()
