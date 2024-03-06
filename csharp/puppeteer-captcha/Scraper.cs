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
        Log($"Connected! Navigating to {url}...");
        var page = await browser.NewPageAsync();
        var client = await page.Target.CreateCDPSessionAsync();
        await page.GoToAsync(url, /* timeout= */ 2 * 60 * 1000);
        Log("Navigated! Waiting captcha to detect and solve...");
        var result = await client.SendAsync("Captcha.waitForSolve", new
        {
            detectTimeout = 10 * 1000,
        });
        var status = (string) result["status"]!;
        Log($"Captcha status: {status}");
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
