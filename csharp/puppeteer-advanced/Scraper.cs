using PuppeteerSharp;
using System.Net.WebSockets;
using System.Text;

class Scraper
{

    private string _auth;

    public Scraper(string auth)
    {
        _auth = auth;
    }

    private async Task<IBrowser> Connect()
    {
        if (_auth == "USER:PASS")
        {
            throw new Exception("Provide Scraping Browsers credentials in AUTH"
                    + " environment variable or update the script.");
        }
        var wsEndpoint = $"wss://{_auth}@brd.superproxy.io:9222";
        var options = new ConnectOptions()
        {
            BrowserWSEndpoint = wsEndpoint,
            WebSocketFactory = async (uri, options, cToken) =>
            {
                var socket = new ClientWebSocket();
                var authBytes = Encoding.UTF8.GetBytes(_auth);
                var authHeader = "Basic " + Convert.ToBase64String(authBytes);
                socket.Options.SetRequestHeader("Authorization", authHeader);
                socket.Options.KeepAliveInterval = TimeSpan.Zero;
                await socket.ConnectAsync(uri, cToken);
                return socket;
            },
        };
        return await Puppeteer.ConnectAsync(options);
    }

    public async Task Scrape(string url)
    {
        Log("Connecting to Browser...");
        using var browser = await Connect();
        Log("Connected! Starting inspect session...");
        var page = await browser.NewPageAsync();
        var client = await page.Target.CreateCDPSessionAsync();
        var frames = await client.SendAsync("Page.getFrameTree");
        var frameId = (string) frames!["frameTree"]!["frame"]!["id"]!;
        var inspect = await client.SendAsync("Page.inspect",
                new { frameId = frameId });
        var inspectUrl = (string) inspect!["url"]!;
        Log($"You can inspect this session at: {inspectUrl}");
        Log("Scraping will continue in 10 seconds...");
        await Task.Delay(10 * 1000);
        Log($"Navigating to {url}...");
        await page.GoToAsync(url, /* timeout= */ 2 * 60 * 1000);
        Log("Navigated! Scraping paragraphs...");
        var paragraphs = await page.QuerySelectorAllHandleAsync("p");
        var data = await paragraphs.EvaluateFunctionAsync(
                "els => els.map(el => el.innerText)");
        Log($"Scraped! Data: {data}");
        Log("Session will be closed in 1 minute...");
        await Task.Delay(60 * 1000);
        Log("Closing session.");
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
        var scraper = new Scraper(auth);
        await scraper.Scrape(url);
    }

}
