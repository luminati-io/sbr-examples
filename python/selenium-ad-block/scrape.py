#!/usr/bin/env python3
from os import environ
from time import time
from selenium.webdriver import Remote, ChromeOptions as Options
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection as Connection

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://www.w3schools.com/js/js_dates.asp')
AD_BLOCK = environ.get('AD_BLOCK', default='1')

def scrape(url=TARGET_URL):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH '
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    server_addr = f'https://{AUTH}@brd.superproxy.io:9515'
    connection = Connection(server_addr, 'goog', 'chrome')
    driver = Remote(connection, options=Options())

    def cdp(cmd, params={}):
        return driver.execute('executeCdpCommand', {
            'cmd': cmd,
            'params': params,
        })['value']

    try:
        begin = time()
        print('Connected!')
        result = driver.execute_cdp_cmd('Browser.getSessionId', {})
        session_id = result['sessionId']
        print('Current session ID:', session_id)
        if AD_BLOCK == '1':
            print('Enabling AdBlock...')
            cdp('Unblocker.enableAdBlock')
            print('Enabled!')
        print(f'Navigating to {url}...')
        driver.get(url)

        data = driver.page_source
        elapsed = time() - begin
        print(f'Done! Time: {elapsed}')
        return data

    finally:
        driver.quit()


if __name__ == '__main__':
    scrape()
