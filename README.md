sbr-examples
============

Examples of BrightData's Scraping Browsers usage using common browser-control
libraries.

- *-basic: simple scraping of targeted page
- *-captcha: open a page and wait for captcha to solve
- *-advanced: inspect scraping session, advanced scraping using js snippets

How to run examples
-------------------

You need to get Scraping Browsers credentials in the control panel.
Pass it in format `USER:PASS` as environment variable `AUTH`

for unix shell:
```bash
export AUTH=brd-customer-hl_01234567-zone-scraping_browser:abcdefghijkl
node scrape.js
```

for windows cmd:
```cmd
set AUTH=brd-customer-hl_01234567-zone-scraping_browser:abcdefghijkl
node scrape.js
```

for powershell:
```powershell
$Env:AUTH = 'brd-customer-hl_01234567-zone-scraping_browser:abcdefghijkl'
node scrape.js
```

You can also pass `TARGET_URL` environment variable to change default
targeted website.

nodejs
------

To install required libraries use npm package manager

```
$ cd nodejs/puppeteer-basic
.../puppeteer-basic$ npm install
.../puppeteer-basic$ node scrape.js
```

python
------

To install required libraries use pip package manager

```
$ cd python/playwright-async-basic
.../playwright-async-basic$ pip3 install -r requirements.txt
.../playwright-async-basic$ python3 scrape.py
```

csharp
------

Use dotnet utility to install required libraries, build and run

```
$ cd csharp/puppeteer-basic
.../puppeteer-basic$ dotnet run
```

