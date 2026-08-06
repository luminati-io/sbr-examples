#!/usr/bin/env python3
import json
from os import environ
from random import random
from selenium.webdriver import Remote, ChromeOptions as Options
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection as Connection
from selenium.webdriver.common.by import By

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://ifconfig.co/json')

def scrape(num, url, session_id):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH '
                        'environment variable or update the script.')
    print(f'Scrape {num}: Connecting to Browser...')
    server_addr = f'https://{AUTH}@brd.superproxy.io:9515'
    connection = Connection(server_addr, 'goog', 'chrome')
    driver = Remote(connection, options=Options())

    def cdp(cmd, params={}):
        return driver.execute('executeCdpCommand', {
            'cmd': cmd,
            'params': params,
        })['value']

    try:
        print(f'Scrape {num}: Connected! Attaching session {session_id}...')
        cdp('Proxy.useSession', {'sessionId': session_id})
        print(f'Scrape {num}: Navigating to {url}...')
        driver.get(url)
        print(f'Scrape {num}: Navigated! Scraping data...')
        body = driver.find_element(By.CSS_SELECTOR, 'body')
        data = body.text
        return json.loads(data)['ip']
    finally:
        print(f'Scrape {num}: Closing browser...')
        driver.quit()


def main(url=TARGET_URL):
    session_id = format(int(0xFFFFFFFF * random()), 'x')
    print(f'Using proxy session: {session_id}')
    ip1 = scrape(1, url, session_id)
    ip2 = scrape(2, url, session_id)
    print('IPs:', [ip1, ip2])
    print('Same IP (session persisted)?', ip1 == ip2)


if __name__ == '__main__':
    main()
