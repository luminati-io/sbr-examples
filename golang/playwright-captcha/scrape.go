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
	br, err := connect()
	if err != nil {
		return "", err
	}
	defer br.Close()
	fmt.Printf("Connected! Navigating to %s...\n", url)
	page, err := br.NewPage()
	if err != nil {
		return "", err
	}
	session, err := page.Context().NewCDPSession(page)
	if err != nil {
		return "", err
	}
	_, err = page.Goto(url)
	if err != nil {
		return "", err
	}
	fmt.Print("Navigated! Waiting captcha to detect and solve...\n")
	result, err := session.Send("Captcha.waitForSolve", map[string]any{
		"detectTimeout": 30000,
	})
	if err != nil {
		return "", err
	}
	status, _ := result.(map[string]interface{})["status"].(string)
	fmt.Printf("Captcha status: %s\n", status)
	return status, nil
}

func main() {
	url, ok := os.LookupEnv("TARGET_URL")
	if !ok {
		url = "https://example.com"
	}
	_, err := scrape(url)
	if err != nil {
		log.Fatal(err)
	}
}
