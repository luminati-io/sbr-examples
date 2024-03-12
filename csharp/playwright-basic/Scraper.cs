using Microsoft.Playwright;

class Scraper
{

    private IPlaywright _pw;
    private string _auth;

    public Scraper(IPlaywright pw, string auth)
    {
        _pw = pw;
        _auth = auth;
    }

    private async Task<IBrowser> Connect()
    {
        if (_auth == "USER:PASS")
        {
            throw new Exception("Provide Scraping Browsers credentials in AUTH"
                    + " environment variable or update the script.");
        }
        var endpointURL = $"wss://{_auth}@brd.superproxy.io:9222";
        return await _pw.Chromium.ConnectOverCDPAsync(endpointURL);
    }

    public async Task Scrape(string url)
    {
        Log("Connecting to Browser...");
        var browser = await Connect();
        try {
            Log($"Connected! Navigating to {url}...");
            var page = await browser.NewPageAsync();
            await page.GotoAsync(url, new (){ Timeout = 2 * 60 * 1000 });
            Log("Navigated! Scraping page content...");
            var data = await page.ContentAsync();
            Log($"Scraped! Data: {data}");
        } finally {
            await browser.CloseAsync();
        }
    }

    private static string Env(string name, string defaultValue)
    {
        return Environment.GetEnvironmentVariable(name) ?? defaultValue;
    }

    private static void Log(string message)
    {
        Console.WriteLine(message);
    }

    public static async Task Main()
    {
        var auth = Env("AUTH", "USER:PASS");
        var url = Env("TARGET_URL", "https://example.com");
        var pw = await Playwright.CreateAsync();
        var scraper = new Scraper(pw, auth);
        await scraper.Scrape(url);
    }

}
