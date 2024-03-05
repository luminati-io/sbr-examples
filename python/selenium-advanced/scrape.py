#!/usr/bin/env python3
from os import environ
from time import sleep
from selenium.webdriver import Remote, ChromeOptions as Options
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection as Connection
from selenium.webdriver.common.by import By

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
        def cdp(cmd, params={}):
            return driver.execute('executeCdpCommand', {
                'cmd': cmd,
                'params': params,
            })['value']
        print('Connected! Starting inspect session...')
        frames = cdp('Page.getFrameTree')
        frame_id = frames['frameTree']['frame']['id']
        inspect = cdp('Page.inspect', {
            'frameId': frame_id,
        })
        inspect_url = inspect['url']
        print(f'You can inspect this session at: {inspect_url}.')
        print('Scraping will continue in 10 seconds...')
        sleep(10)
        print(f'Navigating to {url}...')
        driver.get(url)
        print('Navigated! Scraping paragraphs...')
        paragraphs = driver.find_elements(By.TAG_NAME, 'p')
        data = driver.execute_script(
            'return arguments[0].map(el => el.innerText)', paragraphs)
        print('Scraped! Data', data)
        print('Session will be closed in 1 minute...')
        sleep(60)
        print('Closing session.')


if __name__ == '__main__':
    scrape()
