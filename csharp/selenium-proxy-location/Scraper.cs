using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Remote;

class Scraper
{

    private string _auth;

    public Scraper(string auth)
    {
        _auth = auth;
    }

    private static (double, double) GetLatLon(string location)
    {
        switch (location)
        {
            case "amsterdam": return (52.377956, 4.897070);
            case "london": return (51.509865, -0.118092);
            case "new_york": return (40.730610, -73.935242);
            case "paris": return (48.864716, 2.349014);
            default:
                throw new Exception("Unknown location");
        }
    }

    private WebDriver Connect()
    {
        if (_auth == "USER:PASS")
        {
            throw new Exception("Provide Scraping Browsers credentials in AUTH"
                    + " environment variable or update the script.");
        }
        var uri = new Uri($"https://{_auth}@brd.superproxy.io:9515");
        var executor = new HttpCommandExecutor(uri, TimeSpan.FromSeconds(60));
        var cdpCommand = new HttpCommandInfo(HttpCommandInfo.PostCommand,
                "/session/{sessionId}/goog/cdp/execute");
        executor.TryAddCommand("cdp", cdpCommand);
        var capabilities = new ChromeOptions().ToCapabilities();
        return new RemoteWebDriver(executor, capabilities);
    }

    public void Scrape(string url, string location)
    {
        var (lat, lon) = GetLatLon(location);
        Log("Connecting to Browser...");
        var driver = Connect();
        try {
            Log("Connected! Changing proxy location"
                    + $" to {location} ({lat}, {lon})");
            driver.ExecuteCustomDriverCommand("cdp", new ()
            {
                {"cmd", "Proxy.setLocation"},
                {"params", new Dictionary<string, object>(){
                    {"lat", lat},
                    {"lon", lon},
                    {"distance", 50 /* kilometers */},
                }},
            });
            Log($"Navigating to {url}...");
            driver.Navigate().GoToUrl(url);
            Log("Navigated! Scraping data...");
            var body = driver.FindElement(By.CssSelector("body"));
            var data = body.Text;
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
        var url = Env("TARGET_URL", "https://geo.brdtest.com/mygeo.json");
        var location = Env("LOCATION", "amsterdam");
        var scraper = new Scraper(auth);
        scraper.Scrape(url, location);
    }

}
