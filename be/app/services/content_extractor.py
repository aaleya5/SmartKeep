import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from datetime import datetime
import re
import praw
import logging
import asyncio
from app.core.config import settings

logger = logging.getLogger(__name__)


class ContentScraper:

    @staticmethod
    async def scrape_url(url: str) -> dict:
        """
        Scrape content from URL and extract metadata asynchronously.
        
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
        # Extract domain
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        
        # Check if this is a Reddit URL and if we have API credentials
        if domain in ["reddit.com", "www.reddit.com", "old.reddit.com"] and settings.REDDIT_CLIENT_ID and settings.REDDIT_CLIENT_SECRET:
            try:
                # praw is synchronous, so we run it in a thread pool to avoid blocking
                reddit = praw.Reddit(
                    client_id=settings.REDDIT_CLIENT_ID,
                    client_secret=settings.REDDIT_CLIENT_SECRET.get_secret_value() if hasattr(settings.REDDIT_CLIENT_SECRET, 'get_secret_value') else settings.REDDIT_CLIENT_SECRET,
                    user_agent="SmartKeep/1.0"
                )
                
                # Run synchronous praw call in executor
                loop = asyncio.get_event_loop()
                post = await loop.run_in_executor(None, lambda: reddit.submission(url=url))
                
                title = post.title
                content = f"{post.title}\n\n{post.selftext}"
                author = post.author.name if post.author else "[deleted]"
                published_at = datetime.fromtimestamp(post.created_utc)
                
                return {
                    "title": title or "Reddit Post",
                    "content": content.strip(),
                    "domain": domain,
                    "source_url": url,
                    "og_image_url": getattr(post, 'url', None) if getattr(post, 'url', None) and not post.is_self else None,
                    "favicon_url": "https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png",
                    "author": author,
                    "published_at": published_at,
                }
            except Exception as e:
                logger.error(f"Failed to scrape Reddit using PRAW: {e}. Falling back to standard scraper.")
        
        # Standard scraping flow for non-Reddit or fallback
        # Implement retry logic for standard scraping
        max_scrape_retries = 2
        last_error = None
        
        for attempt in range(max_scrape_retries + 1):
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0',
                }
                # Increase timeout on each attempt
                current_timeout = 10.0 + (attempt * 5.0)
                
                async with httpx.AsyncClient(headers=headers, timeout=current_timeout, follow_redirects=True) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    html = response.text
                    break # Success!
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                last_error = e
                if attempt < max_scrape_retries:
                    wait_time = 1.0 * (2 ** attempt)
                    logger.warning(f"Scrape attempt {attempt+1} failed for {url}: {str(e)}. Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"All scrape attempts failed for {url}: {str(e)}")
                    raise ValueError(f"Unable to fetch URL after {max_scrape_retries+1} attempts: {str(e)}")

        soup = BeautifulSoup(html, "html.parser")
        
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
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'iframe', 'button']):
            tag.decompose()
        
        # Try to find main content areas using heuristics
        content = ""
        
        # 1. Look for article tag
        article = soup.find("article")
        if article:
            content = ContentScraper._extract_text_from_element(article)
        
        # 2. Look for main tag
        if not content or len(content) < 200:
            main = soup.find("main")
            if main:
                content = ContentScraper._extract_text_from_element(main)
        
        # 3. Look for common content IDs/classes
        if not content or len(content) < 200:
            for selector in ['#content', '.content', '.post-content', '.article-body', '#main-content', '.entry-content']:
                el = soup.select_one(selector)
                if el:
                    content = ContentScraper._extract_text_from_element(el)
                    if len(content) > 500:
                        break
        
        # 4. Fallback: Find the div with the most paragraphs
        if not content or len(content) < 200:
            best_div = None
            max_p = 0
            for div in soup.find_all("div"):
                p_count = len(div.find_all("p", recursive=False))
                if p_count > max_p:
                    max_p = p_count
                    best_div = div
            
            if best_div:
                content = ContentScraper._extract_text_from_element(best_div)
        
        # 5. Last resort: all paragraphs
        if not content:
            paragraphs = soup.find_all("p")
            content = "\n".join(p.get_text(strip=True) for p in paragraphs)
        
        # Clean up content
        content = re.sub(r'\n{3,}', '\n\n', content)  # Replace multiple newlines
        content = content.strip()
        
        return {
            "title": title.strip() if title else "Untitled",
            "content": content,
            "domain": domain,
            "source_url": url,
            "og_image_url": og_image_url,
            "favicon_url": favicon_url,
            "author": author,
            "published_at": published_at,
        }

    @staticmethod
    def _extract_text_from_element(element) -> str:
        """Extract clean text from an element, preserving paragraph breaks."""
        text_blocks = []
        for p in element.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'code']):
            t = p.get_text(strip=True)
            if t:
                text_blocks.append(t)
        return "\n\n".join(text_blocks)
