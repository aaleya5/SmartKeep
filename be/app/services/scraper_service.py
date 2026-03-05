import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from datetime import datetime
import re


class ContentScraper:

    @staticmethod
    def scrape_url(url: str) -> dict:
        """
        Scrape content from URL and extract metadata.
        
        Returns dict with:
        - title
        - content (body text)
        - domain
        - source_url
        - og_image_url (optional)
        - favicon_url (optional)
        - author (optional)
        - published_at (optional)
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Unable to fetch URL: {str(e)}")

        soup = BeautifulSoup(response.text, "html.parser")
        
        # Extract domain
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        
        # Extract title
        title = None
        if soup.title:
            title = soup.title.string
        if not title:
            og_title = soup.find("meta", property="og:title")
            if og_title:
                title = og_title.get("content")
        if not title:
            h1 = soup.find("h1")
            if h1:
                title = h1.get_text(strip=True)
        title = title or "Untitled"
        
        # Extract og:image
        og_image = soup.find("meta", property="og:image")
        og_image_url = None
        if og_image:
            og_image_url = og_image.get("content")
            # Make absolute URL if relative
            if og_image_url and not og_image_url.startswith(('http://', 'https://')):
                og_image_url = urljoin(url, og_image_url)
        
        # Extract favicon
        favicon_url = None
        favicon_link = soup.find("link", rel="icon") or soup.find("link", rel="shortcut icon")
        if favicon_link and favicon_link.get("href"):
            favicon_url = favicon_link.get("href")
            if favicon_url and not favicon_url.startswith(('http://', 'https://')):
                favicon_url = urljoin(url, favicon_url)
        else:
            # Default favicon location
            favicon_url = f"https://{domain}/favicon.ico"
        
        # Extract author
        author = None
        author_meta = (
            soup.find("meta", attrs={"name": "author"}) or
            soup.find("meta", property="article:author") or
            soup.find("meta", attrs={"name": "twitter:creator"})
        )
        if author_meta:
            author = author_meta.get("content")
        if not author:
            author_link = soup.find("a", class_=re.compile(r'author', re.I))
            if author_link:
                author = author_link.get_text(strip=True)
        
        # Extract published date
        published_at = None
        date_meta = (
            soup.find("meta", property="article:published_time") or
            soup.find("meta", property="og:updated_time") or
            soup.find("meta", attrs={"name": "date"})
        )
        if date_meta:
            date_str = date_meta.get("content")
            if date_str:
                try:
                    # Try parsing ISO format
                    published_at = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    # Try common date formats
                    for fmt in ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S', '%B %d, %Y']:
                        try:
                            published_at = datetime.strptime(date_str[:19], fmt)
                            break
                        except (ValueError, AttributeError):
                            continue
        
        # Extract main content
        # Remove script, style, nav, footer, header elements
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form']):
            tag.decompose()
        
        # Try to find main content areas
        content = ""
        
        # Try article tag first
        article = soup.find("article")
        if article:
            paragraphs = article.find_all("p")
            content = "\n".join(p.get_text(strip=True) for p in paragraphs)
        
        # Try main tag
        if not content:
            main = soup.find("main")
            if main:
                paragraphs = main.find_all("p")
                content = "\n".join(p.get_text(strip=True) for p in paragraphs)
        
        # Try common content class names
        if not content:
            for class_name in ['content', 'article-content', 'post-content', 'entry-content', 'story-body']:
                content_div = soup.find(class_=class_name)
                if content_div:
                    paragraphs = content_div.find_all("p")
                    content = "\n".join(p.get_text(strip=True) for p in paragraphs)
                    break
        
        # Fallback to all paragraphs
        if not content:
            paragraphs = soup.find_all("p")
            content = "\n".join(p.get_text(strip=True) for p in paragraphs)
        
        # Clean up content
        content = re.sub(r'\n{3,}', '\n\n', content)  # Replace multiple newlines
        content = content.strip()
        
        return {
            "title": title,
            "content": content,
            "domain": domain,
            "source_url": url,
            "og_image_url": og_image_url,
            "favicon_url": favicon_url,
            "author": author,
            "published_at": published_at,
        }
