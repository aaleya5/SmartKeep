import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

class ContentScraper:

    @staticmethod
    def scrape_url(url: str) -> dict:
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
        except Exception:
            raise ValueError("Unable to fetch URL")

        soup = BeautifulSoup(response.text, "html.parser")

        title = soup.title.string if soup.title else "No Title"

        paragraphs = soup.find_all("p")
        content = "\n".join(p.get_text() for p in paragraphs)

        domain = urlparse(url).netloc

        return {
            "title": title,
            "content": content,
            "domain": domain,
            "source_url": url
        }
