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

    private async Task<IBrowser> Connect()
    {
        if (_auth == "USER:PASS")
        {
            throw new Exception("Provide Scraping Browsers credentials in AUTH"
                    + " environment variable or update the script.");
        }
        var options = new ConnectOptions()
        {
            BrowserWSEndpoint = "wss://brd.superproxy.io:9222",
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

    public async Task Scrape(string url, string location)
    {
        var (lat, lon) = GetLatLon(location);
        Log("Connecting to Browser...");
        var browser = await Connect();
        try
        {
            Log("Connected! Changing proxy location"
                    + $" to {location} ({lat}, {lon})");
            var page = await browser.NewPageAsync();
            var client = await page.Target.CreateCDPSessionAsync();
            await client.SendAsync("Proxy.setLocation", new
            {
                lat = lat,
                lon = lon,
                distance = 50 /* kilometers */
            });
            Log($"Navigating to {url}...");
            await page.GoToAsync(url, /* timeout= */ 2 * 60 * 1000);
            Log("Navigated! Scraping data...");
            var body = await page.QuerySelectorAsync("body");
            var data = await body.EvaluateFunctionAsync("el => el.innerText");
            Log($"Scraped! Data: {data}");
        }
        finally
        {
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
        var url = Env("TARGET_URL", "https://geo.brdtest.com/mygeo.json");
        var location = Env("LOCATION", "amsterdam");
        var scraper = new Scraper(auth);
        await scraper.Scrape(url, location);
    }

}
