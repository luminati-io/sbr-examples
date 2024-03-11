#!/usr/bin/env python3
import asyncio
from os import environ
from base64 import standard_b64decode
from playwright.async_api import Playwright, Page, CDPSession, async_playwright

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL',
                         default='https://myjob.page/tools/test-files')
SELECTOR = environ.get('SELECTOR', default='a[role=button]')
FILENAME = environ.get('FILENAME', default='./testfile.zip')


async def scrape(playwright: Playwright, url=TARGET_URL,
                 selector=SELECTOR, filename=FILENAME):
    if AUTH == 'USER:PASS':
        raise Exception('Provide Scraping Browsers credentials in AUTH ' +
                        'environment variable or update the script.')
    print('Connecting to Browser...')
    endpoint_url = f'wss://{AUTH}@brd.superproxy.io:9222'
    browser = await playwright.chromium.connect_over_cdp(endpoint_url)
    try:
        print(f'Connected! Navigating to {url}...')
        page = await browser.new_page()
        client = await page.context.new_cdp_session(page)
        await page.goto(url, timeout=2*60_000)
        print('Navigated! Initiating download...')
        request_id = await initiate_download(page, client, selector)
        print(f'Download started! Stream it to {filename}...')
        stream = await client.send('Fetch.takeResponseBodyAsStream', {
            'requestId': request_id,
        })
        file = open(filename, 'wb')
        file_size = 0
        while True:
            chunk = await client.send('IO.read', {
                'handle': stream['stream'],
            })
            if chunk['base64Encoded']:
                data = standard_b64decode(chunk['data'])
            else:
                data = bytes(chunk['data'], 'utf8')
            file.write(data)
            file_size += len(data)
            if chunk['eof']:
                break
        file.close()
        print(f'Download saved! Size: {file_size}')
    finally:
        await browser.close()


async def initiate_download(page: Page, client: CDPSession, selector):
    future = asyncio.get_running_loop().create_future()

    def on_request_paused(event):
        request_id = event['requestId']
        if future.done():
            asyncio.ensure_future(client.send('Fetch.continueRequest', {'requestId': request_id}))
        else:
            future.set_result(request_id)

    def on_click(click: asyncio.Future):
        if not future.done() and click.exception():
            future.set_exception(click.exception())

    await client.send('Fetch.enable', {
        'patterns': [{
            'requestStage': 'Response',
            'resourceType': 'Document',
        }],
    })
    client.on('Fetch.requestPaused', on_request_paused)
    asyncio.ensure_future(page.click(selector)).add_done_callback(on_click)
    return await future


async def main():
    async with async_playwright() as playwright:
        await scrape(playwright)


if __name__ == '__main__':
    asyncio.run(main())
