import com.microsoft.playwright.*;
import java.util.HashMap;

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

    public void scrape(String url) throws Exception {
        log("Connecting to Browser...");
        var browser = connect();
        try {
            log("Connected! Navigating to %s...", url);
            var page = browser.newPage();
            page.navigate(url);
            log("Navigated! Scraping page content...");
            var data = page.content();
            log("Scraped! Data: %s", data);
        } finally {
            browser.close();
        }
    }

    private static void log(String message, Object... params) {
        System.out.println(String.format(message, params));
    }

    public static void main(String[] args) throws Exception {
        var env = System.getenv();
        var auth = env.getOrDefault("AUTH", "USER:PASS");
        var targetUrl = env.getOrDefault("TARGET_URL", "https://example.com");
        var options = new Playwright.CreateOptions()
            .setEnv(new HashMap<>(env){{
                put("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "1");
            }});
        try (var pw = Playwright.create(options)) {
            var scraper = new Scraper(pw, auth);
            scraper.scrape(targetUrl);
        }
    }

}
