import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import java.net.URI;

public class Scraper {

    private String _auth;

    public Scraper(String auth) {
        _auth = auth;
    }

    private RemoteWebDriver connect() throws Exception {
        if (_auth == "USER:PASS") {
            throw new Exception("Provide Scraping Browsers credentials in AUTH"
                    + " environment variable or update the script.");
        }
        var address = new URI("https://" + _auth + "@brd.superproxy.io:9515");
        var options = new ChromeOptions();
        return new RemoteWebDriver(address.toURL(), options);
    }

    public void scrape(String url) throws Exception {
        log("Connecting to Browser...");
        var driver = connect();
        try {
            log("Connected! Navigating to %s...", url);
            driver.navigate().to(url);
            log("Navigated! Scraping page content...");
            var data = driver.getPageSource();
            log("Scraped! Data: %s", data);
        } finally {
            driver.quit();
        }
    }

    private static void log(String message, Object... params) {
        System.out.println(String.format(message, params));
    }

    public static void main(String[] args) throws Exception {
        var env = System.getenv();
        var auth = env.getOrDefault("AUTH", "USER:PASS");
        var targetUrl = env.getOrDefault("TARGET_URL", "https://example.com");
        var scraper = new Scraper(auth);
        scraper.scrape(targetUrl);
    }

}
