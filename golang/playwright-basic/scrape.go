package main

import (
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/playwright-community/playwright-go"
)

func connect() (playwright.Browser, error) {
	err := playwright.Install(&playwright.RunOptions{
		SkipInstallBrowsers: true,
	})
	if err != nil {
		return nil, err
	}
	pw, err := playwright.Run()
	if err != nil {
		return nil, err
	}
	auth, ok := os.LookupEnv("AUTH")
	if !ok {
		return nil, errors.New("Provide Scraping Browsers credentials in AUTH environment variable or update the script.")
	}
	endpointURL := fmt.Sprintf("wss://%s@brd.superproxy.io:9222", auth)
	return pw.Chromium.ConnectOverCDP(endpointURL)
}

func scrape(url string) (string, error) {
	fmt.Print("Connecting to Browser...\n")
	br, err1 := connect()
	if err1 != nil {
		return "", err1
	}
	defer br.Close()
	fmt.Printf("Connected! Navigating to %s...\n", url)
	page, err2 := br.NewPage()
	if err2 != nil {
		return "", err2
	}
	_, err3 := page.Goto(url)
	if err3 != nil {
		return "", err3
	}
	result, err4 := page.Content()
	if err4 != nil {
		return "", err4
	}
	fmt.Printf("Scraped! Data: %s\n", result)
	return result, nil
}

func main() {
	url := os.Getenv("TARGET_URL")
	if url == "" {
		url = "https://example.com"
	}
	_, err := scrape(url)
	if err != nil {
		log.Fatal(err)
	}
}
