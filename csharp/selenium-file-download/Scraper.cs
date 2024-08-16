using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Remote;
using OpenQA.Selenium.Support.UI;
using System.Text;

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

    public void Scrape(string url, string selector, string filename)
    {
        Log("Connecting to Browser...");
        var driver = Connect();
        try {
            Log("Connected! Enable file download...");
            Cdp(driver, "Download.enable", new (){
                {"allowedContentTypes", new []{"application/zip"}},
            });
            Log($"Navigating to {url}...");
            driver.Navigate().GoToUrl(url);
            Log("Navigated! Initiating download...");
            driver.FindElement(By.CssSelector(selector)).Click();
            var wait = new WebDriverWait(driver, TimeSpan.FromSeconds(60));
            var data = wait.Until(_=>{
                var result = Cdp(driver, "Download.getList");
                var data = result.Get<object[]>("data");
                if (data.Length == 0)
                {
                    throw new Exception("List is empty");
                }
                return (Dictionary<string, object>) data[0];
            });
            Log($"Download is available! Saving it to {filename}...");
            var requestId = data.Get<string>("id");
            var response = Cdp(driver, "Download.getDownloadedBody", new (){
                {"requestId", requestId},
            });
            var file = File.OpenWrite(filename);
            var bytes = response.Get<bool>("base64Encoded")
                ? Convert.FromBase64String(response.Get<string>("body"))
                : Encoding.UTF8.GetBytes(response.Get<string>("body"));
            file.Write(bytes);
            Log($"Download saved! Size {bytes.Length}.");
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
        var url = Env("TARGET_URL", "https://myjob.page/tools/test-files");
        var selector = Env("SELECTOR", "a[role=button]");
        var filename = Env("FILENAME", "./testfile.zip");
        var scraper = new Scraper(auth);
        scraper.Scrape(url, selector, filename);
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
