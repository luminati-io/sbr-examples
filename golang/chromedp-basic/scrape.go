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

func connect(ctx context.Context, auth string) (context.Context, context.CancelFunc) {
	if auth == "" {
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

func scrape(ctx context.Context, url string) (string, error) {
	var result string
	bCtx, bCtxCancel := chromedp.NewContext(ctx)
	defer bCtxCancel()
	err := chromedp.Run(bCtx,
		chromedp.Navigate(url),
		chromedp.EvaluateAsDevTools("document.documentElement.outerHTML", &result),
	)
	return result, err
}

func main() {
	auth := os.Getenv("AUTH")
	url := os.Getenv("TARGET_URL")
	if url == "" {
		url = "https://example.com"
	}
	ctx, ctxCancel := connect(context.Background(), auth)
	defer ctxCancel()
	result, err := scrape(ctx, url)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Result: %s\n", result)
}
