import java.net.URI;
import java.util.Map;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.remote.RemoteExecuteMethod;

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
            log("Navigated! Waiting captcha to detect and solve...");
            var exec = new RemoteExecuteMethod(driver);
            var result = (Map<String, ?>) exec.execute("executeCdpCommand", Map.of(
                "cmd", "Captcha.waitForSolve",
                "params", Map.of("detectTimeout", 10000)));
            var status = (String) result.get("status");
            log("Captcha status: %s", status);
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
