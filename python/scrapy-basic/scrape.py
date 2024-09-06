#!/usr/bin/env python3
from os import environ
from scrapy import Spider, Request
from scrapy.crawler import CrawlerProcess
from scrapy_playwright.page import PageMethod

AUTH = environ.get('AUTH', default='USER:PASS')
TARGET_URL = environ.get('TARGET_URL', default='https://example.com')

PW_SETTINGS = {
    'DOWNLOAD_HANDLERS': {
        'http': 'scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler',
        'https': 'scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler',
    },
    'TWISTED_REACTOR':
        'twisted.internet.asyncioreactor.AsyncioSelectorReactor',
    'PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT': 2 * 60 * 1000,
    'PLAYWRIGHT_PROCESS_REQUEST_HEADERS': None,
    'PLAYWRIGHT_MAX_PAGES_PER_CONTEXT': 1,
}


class ScrapingBrowsersSpider(Spider):
    name = 'ScrapingBrowsersSpider'

    def __init__(self, *args, target_url=TARGET_URL, **kwargs):
        super().__init__(*args, **kwargs)
        self.target_url = target_url

    @classmethod
    def from_crawler(cls, crawler, *args, auth=AUTH, **kwargs):
        if auth == 'USER:PASS':
            raise Exception('Provide Scraping Browsers credentials in AUTH '
                            'environment variable or update the script.')
        spider = super().from_crawler(crawler, *args, **kwargs)
        cdp_url = f'wss://{auth}@brd.superproxy.io:9222'
        spider.settings.set('PLAYWRIGHT_CDP_URL', cdp_url, priority='spider')
        for k, v in PW_SETTINGS.items():
            spider.settings.set(k, v, priority='spider')
        return spider

    def start_requests(self):
        yield Request(self.target_url, meta={
            'playwright': True,
            'playwright_page_methods': [
                PageMethod('content'),
            ],
        })

    def parse(self, response):
        data = response.meta['playwright_page_methods'][0]
        yield {'data': data.result}


def main():
    process = CrawlerProcess()
    process.crawl(ScrapingBrowsersSpider)
    process.start()


if __name__ == '__main__':
    main()
