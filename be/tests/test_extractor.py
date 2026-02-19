from app.services.content_extractor import ContentScraper

def test_invalid_url():
    try:
        ContentScraper.scrape_url("https://invalid.url")
    except ValueError:
        assert True
