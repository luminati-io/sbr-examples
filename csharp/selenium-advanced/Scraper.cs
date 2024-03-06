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

    public void Scrape(string url)
    {
        Log("Connecting to Browser...");
        var driver = Connect();
        try {
            Log("Connected! Starting inspect session...");
            var frames = Cdp(driver, "Page.getFrameTree");
            var frameId = frames.Get<string>("frameTree", "frame", "id");
            var inspect = Cdp(driver, "Page.inspect", new (){
                {"frameId", frameId},
            });
            var inspectUrl = inspect.Get<string>("url");
            Log($"You can inspect this session at: {inspectUrl}");
            Log("Scraping will continue in 10 seconds...");
            Thread.Sleep(10 * 1000);
            Log($"Navigating to {url}...");
            driver.Navigate().GoToUrl(url);
            Log("Navigated! Scraping paragraphs...");
            var paragraphs = driver.FindElements(By.CssSelector("p"));
            var data = (IEnumerable<object>) driver.ExecuteScript(
                    "return arguments[0].map(el => el.innerText);", paragraphs);
            Log($"Scraped! Data: [{string.Join(", ", data)}]");
            Log("Session will be closed in 1 minute...");
            Thread.Sleep(60 * 1000);
        } finally {
            Log("Closing session.");
            driver.Quit();
        }
    }

    private Dictionary<string, object> Cdp(WebDriver driver, string cmd, Dictionary<string, object>? args = null)
    {
        var result = driver.ExecuteCustomDriverCommand("cdp", new ()
        {
            {"cmd", cmd},
            {"params", args ?? new ()},
        });
        return (Dictionary<string, object>) result;
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
        var url = Env("TARGET_URL", "https://example.com");
        var scraper = new Scraper(auth);
        scraper.Scrape(url);
    }

}

static class DictionaryUtility {

    static public T Get<T>(this Dictionary<string, object> dict, params string[] path)
    {
        object result = dict;
        foreach (var name in path)
        {
            if (result is Dictionary<string, object> obj)
                result = obj[name];
            else
                throw new Exception("Wrong type");
        }
        return (T) result;
    }

}
