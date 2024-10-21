package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/chromedp/cdproto/fetch"
	"github.com/chromedp/cdproto/io"
	"github.com/chromedp/cdproto/network"
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

func scrape(ctx context.Context, url string, selector string, filename string) error {
	var requestId fetch.RequestID
	var fileSize int
	var err error
	bCtx, bCtxCancel := chromedp.NewContext(ctx)
	defer bCtxCancel()
	fmt.Printf("Connecting to Scraping Browser...\n")
	return chromedp.Run(bCtx,
		action(func() { fmt.Printf("Connected! Navigating to %s...\n", url) }),
		chromedp.Navigate(url),
		action(func() { fmt.Print("Navigated! Initiating download...\n") }),
		chromedp.ActionFunc(func(ctx context.Context) error {
			requestId, err = initiateDownload(ctx, selector)
			return err
		}),
		action(func() { fmt.Printf("Download started! Stream it to %s...\n", filename) }),
		chromedp.ActionFunc(func(ctx context.Context) error {
			fileSize, err = streamToFile(ctx, requestId, filename)
			return err
		}),
		action(func() { fmt.Printf("Download saved! Size: %d.\n", fileSize) }),
	)
}

func action(f func()) chromedp.ActionFunc {
	return chromedp.ActionFunc(func(ctx context.Context) error {
		f()
		return nil
	})
}

func initiateDownload(ctx context.Context, selector string) (fetch.RequestID, error) {
	pattern := fetch.RequestPattern{"*",
		network.ResourceType("Document"),
		fetch.RequestStage("Response")}
	patterns := []*fetch.RequestPattern{&pattern}
	err := fetch.Enable().WithPatterns(patterns).Do(ctx)
	if err != nil {
		return "", err
	}
	done := make(chan *fetch.EventRequestPaused, 1)
	chromedp.ListenTarget(ctx, func(v interface{}) {
		if ev, ok := v.(*fetch.EventRequestPaused); ok {
			done <- ev
		}
	})
	chromedp.Click(selector).Do(ctx)
	event := <-done
	return event.RequestID, nil
}

func streamToFile(ctx context.Context, requestId fetch.RequestID, filename string) (int, error) {
	handle, err := fetch.TakeResponseBodyAsStream(requestId).Do(ctx)
	if err != nil {
		return 0, err
	}
	f, err := os.Create(filename)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	fileSize := 0
	for true {
		data, eof, err := io.Read(handle).Do(ctx)
		if err != nil {
			return fileSize, err
		}
		bytes, err := base64.StdEncoding.DecodeString(data)
		if err != nil {
			return fileSize, err
		}
		n, err := f.Write(bytes)
		fileSize = fileSize + n
		if err != nil {
			return fileSize, err
		}
		if eof {
			break
		}
	}
	return fileSize, nil
}

func env(name string, defaultValue string) string {
	value, ok := os.LookupEnv(name)
	if ok {
		return value
	}
	return defaultValue
}

func main() {
	url := env("TARGET_URL", "https://calmcode.io/datasets/bigmac")
	selector := env("SELECTOR", "button.border")
	filename := env("FILENAME", "./testfile.csv")
	ctx, ctxCancel := connect(context.Background())
	defer ctxCancel()
	err := scrape(ctx, url, selector, filename)
	if err != nil {
		log.Fatal(err)
	}
}
