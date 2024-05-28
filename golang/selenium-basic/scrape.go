package main

import (
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/tebeka/selenium"
)

func connect() (selenium.WebDriver, error) {
	auth, ok := os.LookupEnv("AUTH")
	if !ok {
		return nil, errors.New("Provide Scraping Browsers credentials in AUTH environment variable or update the script.")
	}
	capabilities := selenium.Capabilities{}
	urlPrefix := fmt.Sprintf("https://%s@brd.superproxy.io:9515", auth)
	return selenium.NewRemote(capabilities, urlPrefix)
}

func scrape(url string) (string, error) {
	fmt.Print("Connecting to Browser...\n")
	driver, err := connect()
	if err != nil {
		return "", err
	}
	defer driver.Quit()
	fmt.Printf("Connected! Navigating to %s...\n", url)
	err = driver.Get(url)
	if err != nil {
		return "", err
	}
	fmt.Print("Navigated! Scraping page content...\n")
	result, err := driver.PageSource()
	fmt.Printf("Scraped! Data: %s\n", result)
	return result, nil
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
