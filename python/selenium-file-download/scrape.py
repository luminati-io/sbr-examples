#!/usr/bin/env python3
from os import environ
from base64 import standard_b64decode
from selenium.webdriver import Remote, ChromeOptions as Options
from selenium.webdriver.chromium.remote_connection import ChromiumRemoteConnection as Connection
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL',
                         default='https://myjob.page/tools/test-files')
SELECTOR = environ.get('SELECTOR', default='a[role=button]')
FILENAME = environ.get('FILENAME', default='./testfile.zip')


def scrape(url=TARGET_URL, selector=SELECTOR, filename=FILENAME):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH ' +
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
        print('Connected! Enable file download...')
        cdp('Download.enable', {'allowedContentTypes': ['application/zip']})
        print(f'Navigating to {url}...')
        driver.get(url)
        print('Navigated! Initiating download...')
        driver.find_element(By.CSS_SELECTOR, selector).click()
        print('Waiting for download...')
        wait = WebDriverWait(driver, timeout=60)
        data = wait.until(lambda _: cdp('Download.getList')['data'])
        request_id = data[0]['id']
        response = cdp('Download.getDownloadedBody', {'requestId': request_id})
        if response['base64Encoded']:
            body = standard_b64decode(response['body'])
        else:
            body = bytes(response['body'], 'utf8')
        with open(filename, 'wb') as file:
            file.write(body)
    finally:
        print('Closing session.')
        driver.quit()


if __name__ == '__main__':
    scrape()
