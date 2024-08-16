using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Remote;
using OpenQA.Selenium.Support.UI;

class Scraper
{

    private string _auth;

    public Scraper(string auth)
    {
        _auth = auth;
    }

    private IWebDriver Connect()
    {
        if (_auth == "USER:PASS")
        {
            throw new Exception("Provide Scraping Browsers credentials in AUTH"
                    + " environment variable or update the script.");
        }
        var uri = new Uri($"https://{_auth}@brd.superproxy.io:9515");
        //uri = new Uri($"http://{_auth}@1.1.1.50:9515");
        var executor = new HttpCommandExecutor(uri, TimeSpan.FromMinutes(1));
        var cdpCommand = new HttpCommandInfo(HttpCommandInfo.PostCommand,
                "/session/{sessionId}/goog/cdp/execute");
        executor.TryAddCommand("cdp", cdpCommand);
        var options = new ChromeOptions();

        // Changing strategy not to wait until page is loaded
        options.PageLoadStrategy = PageLoadStrategy.None;

        var capabilities = options.ToCapabilities();
        return new RemoteWebDriver(executor, capabilities);
    }

    public void Scrape(string url, string selector)
    {
        Log("Connecting to Browser...");
        var driver = Connect();
        try {
            Log($"Connected! Navigating to {url}...");
            driver.Navigate().GoToUrl(url);
            Log($"Waiting for element to appear...");
            var wait = new WebDriverWait(driver, TimeSpan.FromMinutes(1));
            wait.Until(driver => driver.FindElement(By.CssSelector("div.content-center")));
            Log("Found! Scraping page content...");
            var data = driver.PageSource;
            Log($"Scraped! Data: {data}");
        } finally {
            driver.Quit();
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

    public static void Main()
    {
        var auth = Env("AUTH", "USER:PASS");
        var url = Env("TARGET_URL", "https://www.truepeoplesearch.com/results?name=Craig%20A%20Arnold");
        var selector = Env("SELECTOR", "div.content-center");
        var scraper = new Scraper(auth);
        scraper.Scrape(url, selector);
    }

}
