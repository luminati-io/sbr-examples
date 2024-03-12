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

    public async Task Scrape(string url, string selector, string filename)
    {
        Log("Connecting to Browser...");
        var browser = await Connect();
        try
        {
            Log($"Connected! Navigating to {url}...");
            var page = await browser.NewPageAsync();
            var client = await page.Target.CreateCDPSessionAsync();
            await page.GoToAsync(url, /* timeout= */ 2 * 60 * 1000);
            Log("Navigated! Initiating download...");
            var requestId = await InitiateDownload(page, client, selector);
            Log($"Download started! Stream it to {filename}...");
            var stream = await client.SendAsync("Fetch.takeResponseBodyAsStream", new
            {
                requestId = requestId,
            });
            var file = File.OpenWrite(filename);
            var fileSize = 0;
            while (true)
            {
                var chunk = await client.SendAsync("IO.read", new
                {
                    handle = stream["stream"],
                });
                var data = (bool) chunk["base64Encoded"]!
                    ? Convert.FromBase64String((string) chunk["data"]!)
                    : Encoding.UTF8.GetBytes((string) chunk["data"]!);
                await file.WriteAsync(data);
                fileSize += data.Length;
                if ((bool) chunk["eof"]!)
                {
                    break;
                }
            }
            file.Close();
            Log($"Download saved! Size {fileSize}.");
        }
        finally
        {
            await browser.CloseAsync();
        }
    }

    private async Task<string> InitiateDownload(IPage page, ICDPSession client, string selector)
    {
        var task = new TaskCompletionSource<string>();
        void onRequestPaused(object? sender, MessageEventArgs args)
        {
            if (args.MessageID == "Fetch.requestPaused")
                task.TrySetResult((string) args.MessageData["requestId"]!);
        }
        void onClick(Task click)
        {
            if (click.IsFaulted)
                task.TrySetException(click.Exception!);
        }
        await client.SendAsync("Fetch.enable", new
        {
            patterns = new[]{
                new { requestStage = "Response", resourceType = "Document" },
            },
        });
        client.MessageReceived += onRequestPaused;
        var _ = page.ClickAsync(selector).ContinueWith(onClick);
        return await task.Task;
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
        var url = Env("TARGET_URL", "https://myjob.page/tools/test-files");
        var selector = Env("SELECTOR", "a[role=button]");
        var filename = Env("FILENAME", "./testfile.zip");
        var scraper = new Scraper(auth);
        await scraper.Scrape(url, selector, filename);
    }

}
