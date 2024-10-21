import com.microsoft.playwright.*;
import com.google.gson.*;
import java.util.HashMap;
import java.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CompletableFuture;

public class Scraper {

    private Playwright _pw;
    private String _auth;

    public Scraper(Playwright pw, String auth) {
        _pw = pw;
        _auth = auth;
    }

    private Browser connect() throws Exception {
        if (_auth == "USER:PASS") {
            throw new Exception("Provide Scraping Browsers credentials in AUTH"
                    + " environment variable or update the script.");
        }
        var endpointURL = "wss://" + _auth + "@brd.superproxy.io:9222";
        return _pw.chromium().connectOverCDP(endpointURL);
    }

    public void scrape(String url, String selector, String filename) throws Exception {
        log("Connecting to Browser...");
        var browser = connect();
        try {
            log("Connected! Navigating to %s...", url);
            var page = browser.newPage();
            var client = page.context().newCDPSession(page);
            page.navigate(url);
            log("Navigated! Initiating download...");
            var requestId = initiateDownload(page, client, selector);
            log("Download started! Stream it to %s...", filename);
            var stream = client.send("Fetch.takeResponseBodyAsStream", fetchStreamParams(requestId))
                .get("stream")
                .getAsString();
            var file = new File(filename);
            var fileStream = new FileOutputStream(file);
            var fileSize = 0;
            while (true) {
                var chunk = client.send("IO.read", ioReadParams(stream));
                var data = chunk.get("base64Encoded").getAsBoolean()
                    ? Base64.getDecoder().decode(chunk.get("data").getAsString())
                    : chunk.get("data").getAsString().getBytes("UTF-8");
                fileSize += data.length;
                fileStream.write(data);
                if (chunk.get("eof").getAsBoolean()) {
                    break;
                }
            }
            fileStream.close();
            log("Download saved! Size %d.", fileSize);
        } finally {
            browser.close();
        }
    }

    private String initiateDownload(Page page, CDPSession client, String selector) throws Exception {
        var task = new CompletableFuture<String>();
        client.send("Fetch.enable", fetchEnableParams());
        client.on("Fetch.requestPaused", event -> {
            task.complete(event.get("requestId").getAsString());
        });
        CompletableFuture.runAsync(() -> {
            try {
                page.click(selector);
            } catch (Exception e) {
                task.completeExceptionally(e);
            }
        });
        return task.get();
    }

    private static JsonObject fetchStreamParams(String requestId) {
        var params = new JsonObject();
        params.addProperty("requestId", requestId);
        return params;
    }

    private static JsonObject ioReadParams(String handle) {
        var params = new JsonObject();
        params.addProperty("handle", handle);
        return params;
    }

    private static JsonObject fetchEnableParams() {
        var params = new JsonObject();
        var patterns = new JsonArray();
        var pattern = new JsonObject();
        pattern.addProperty("requestStage", "Response");
        pattern.addProperty("resourceType", "Document");
        patterns.add(pattern);
        params.add("patterns", patterns);
        return params;
    }

    private static void log(String message, Object... params) {
        System.out.println(String.format(message, params));
    }

    public static void main(String[] args) throws Exception {
        var env = System.getenv();
        var auth = env.getOrDefault("AUTH", "USER:PASS");
        var targetUrl = env.getOrDefault("TARGET_URL", "https://calmcode.io/datasets/bigmac");
        var selector = env.getOrDefault("SELECTOR", "button.border");
        var filename = env.getOrDefault("FILENAME", "./testfile.csv");
        var options = new Playwright.CreateOptions()
            .setEnv(new HashMap<>(env){{
                put("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "1");
            }});
        try (var pw = Playwright.create(options)) {
            var scraper = new Scraper(pw, auth);
            scraper.scrape(targetUrl, selector, filename);
        }
    }

}
