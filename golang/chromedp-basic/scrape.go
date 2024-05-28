package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/chromedp/chromedp"
	"github.com/gobwas/ws"
)

func connect(ctx context.Context) (context.Context, context.CancelFunc) {
	auth, ok := os.LookupEnv("AUTH")
	if !ok {
		log.Fatal("Provide Scraping Browsers credentials in AUTH environment variable or update the script.")
	}
	// chromedp doesn't support passing authorization in url, so we just set default upgrade request headers for underlying ws library (gowbas/ws)
	header := http.Header{}
	authEncoded := base64.StdEncoding.EncodeToString([]byte(auth))
	header.Add("Authorization", fmt.Sprintf("Basic %s", authEncoded))
	ws.DefaultDialer.Header = ws.HandshakeHeaderHTTP(header)
	wsUrl := "wss://brd.superproxy.io:9222"
	return chromedp.NewRemoteAllocator(ctx, wsUrl, chromedp.NoModifyURL)
}

func action(f func()) chromedp.ActionFunc {
	return chromedp.ActionFunc(func(ctx context.Context) error {
		f()
		return nil
	})
}

func scrape(ctx context.Context, url string) (string, error) {
	var result string
	bCtx, bCtxCancel := chromedp.NewContext(ctx)
	defer bCtxCancel()
	fmt.Printf("Connecting to Scraping Browser...\n")
	err := chromedp.Run(bCtx,
		action(func() { fmt.Printf("Connected! Navigating to %s...\n", url) }),
		chromedp.Navigate(url),
		action(func() { fmt.Print("Navigated! Scraping page content...\n") }),
		chromedp.EvaluateAsDevTools("document.documentElement.outerHTML", &result),
		action(func() { fmt.Printf("Scraped! Data: %s\n", result) }),
	)
	return result, err
}

func main() {
	url, ok := os.LookupEnv("TARGET_URL")
	if !ok {
		url = "https://example.com"
	}
	ctx, ctxCancel := connect(context.Background())
	defer ctxCancel()
	_, err := scrape(ctx, url)
	if err != nil {
		log.Fatal(err)
	}
}
