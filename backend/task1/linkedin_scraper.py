import os
import csv
import time
import random
import platform
import logging
import re
from typing import List, Dict

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
try:
    from webdriver_manager.chrome import ChromeDriverManager
    from webdriver_manager.core.os_manager import ChromeType
except ImportError:
    ChromeDriverManager = None  # Will be installed via requirements.txt
    ChromeType = None
from bs4 import BeautifulSoup
import asyncio
from concurrent.futures import ThreadPoolExecutor


class LinkedInScraper:
    """Scrape LinkedIn profiles using Selenium and BeautifulSoup"""
    
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
    
    def __init__(self, linkedin_email: str = None, linkedin_password: str = None):
        self.linkedin_email = linkedin_email or os.getenv("LINKEDIN_EMAIL")
        self.linkedin_password = linkedin_password or os.getenv("LINKEDIN_PASSWORD")
        
        if not self.linkedin_email or not self.linkedin_password:
            raise ValueError("LINKEDIN_EMAIL and LINKEDIN_PASSWORD must be provided or set in environment variables")
        
        self.executor = ThreadPoolExecutor(max_workers=1)
    
    def _get_random_user_agent(self) -> str:
        """Get random user agent for rotation"""
        return random.choice(self.USER_AGENTS)
    
    def _get_chrome_options(self, headless: bool = True) -> Options:
        """Configure Chrome options with fake headers"""
        options = Options()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        if headless:
            options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument(f"user-agent={self._get_random_user_agent()}")
        # Suppress automation detection and logging
        options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument("--log-level=3")  # Suppress Chrome logs
        # Windows-specific fixes
        if platform.system() == "Windows":
            options.add_argument("--disable-extensions")
            if headless:
                options.add_argument("--disable-software-rasterizer")
        return options
    
    def _get_chrome_service(self) -> Service:
        """Get Chrome service with proper driver setup"""
        logger.info("=" * 60)
        logger.info("Starting ChromeDriver setup...")
        logger.info(f"Platform: {platform.system()} {platform.machine()}")
        
        try:
            if ChromeDriverManager:
                logger.info("ChromeDriverManager is available, attempting to use it...")
                # Use webdriver-manager to auto-download and manage driver
                driver_path = ChromeDriverManager().install()
                logger.info(f"ChromeDriverManager returned path: {driver_path}")
                
                # Fix: webdriver-manager sometimes returns wrong file (like THIRD_PARTY_NOTICES.chromedriver)
                # We need to find the actual chromedriver.exe
                if not driver_path.endswith('.exe') or 'THIRD_PARTY' in driver_path or 'NOTICES' in driver_path:
                    logger.warning(f"Path doesn't look like executable: {driver_path}")
                    logger.info("Searching for actual chromedriver.exe...")
                    
                    # Get the directory containing the driver
                    base_dir = os.path.dirname(driver_path)
                    logger.info(f"Base directory: {base_dir}")
                    
                    # Try common executable locations
                    possible_paths = [
                        os.path.join(base_dir, "chromedriver.exe"),
                        os.path.join(base_dir, "chromedriver"),
                        os.path.join(base_dir, "..", "chromedriver.exe"),
                        os.path.join(base_dir, "..", "chromedriver"),
                    ]
                    
                    # Also check if there's a win64 or win32 subdirectory
                    if "win64" in base_dir or "win32" in base_dir:
                        # Already in the right place, check current and parent dirs
                        possible_paths.extend([
                            os.path.join(base_dir, "chromedriver.exe"),
                            os.path.join(base_dir, "chromedriver"),
                        ])
                    else:
                        # Check for win64/win32 subdirectories
                        parent_dir = os.path.dirname(base_dir)
                        possible_paths.extend([
                            os.path.join(parent_dir, "win64", "chromedriver.exe"),
                            os.path.join(parent_dir, "win32", "chromedriver.exe"),
                            os.path.join(parent_dir, "win64", "chromedriver"),
                            os.path.join(parent_dir, "win32", "chromedriver"),
                        ])
                    
                    # Find the actual executable
                    found_path = None
                    for path in possible_paths:
                        normalized_path = os.path.normpath(path)
                        logger.info(f"Checking: {normalized_path}")
                        if os.path.exists(normalized_path) and os.path.isfile(normalized_path):
                            # On Windows, prefer .exe
                            if platform.system() == "Windows" and normalized_path.endswith('.exe'):
                                found_path = normalized_path
                                logger.info(f"Found executable: {found_path}")
                                break
                            elif platform.system() != "Windows":
                                found_path = normalized_path
                                logger.info(f"Found executable: {found_path}")
                                break
                    
                    if found_path:
                        driver_path = found_path
                    else:
                        # Last resort: search the entire directory tree
                        logger.warning("Could not find chromedriver.exe in expected locations, searching directory tree...")
                        for root, dirs, files in os.walk(base_dir):
                            for file in files:
                                if file == "chromedriver.exe" or (platform.system() != "Windows" and file == "chromedriver"):
                                    found_path = os.path.join(root, file)
                                    logger.info(f"Found in directory search: {found_path}")
                                    driver_path = found_path
                                    break
                            if found_path:
                                break
                
                # Verify the driver file exists and is executable
                if not os.path.exists(driver_path):
                    logger.error(f"ChromeDriver not found at path: {driver_path}")
                    raise FileNotFoundError(f"ChromeDriver not found at {driver_path}")
                
                # Ensure .exe extension on Windows
                if platform.system() == "Windows" and not driver_path.endswith('.exe'):
                    logger.info("Windows detected, ensuring .exe extension...")
                    exe_path = driver_path + '.exe'
                    if os.path.exists(exe_path):
                        logger.info(f"Found .exe version: {exe_path}")
                        driver_path = exe_path
                    else:
                        logger.error(f"No .exe version found at: {exe_path}")
                        raise FileNotFoundError(f"ChromeDriver executable not found. Tried: {driver_path}, {exe_path}")
                
                logger.info(f"Using ChromeDriver path: {driver_path}")
                logger.info(f"File exists: {os.path.exists(driver_path)}")
                logger.info(f"File size: {os.path.getsize(driver_path)} bytes")
                
                logger.info(f"Creating Service with path: {driver_path}")
                service = Service(driver_path)
                logger.info("Service created successfully")
                return service
            else:
                logger.warning("ChromeDriverManager not available, trying auto-detection...")
                # Fallback: try to use system ChromeDriver or let Selenium find it
                service = Service()
                logger.info("Service created with auto-detection")
                return service
        except Exception as e:
            logger.error(f"Error setting up ChromeDriver with webdriver-manager: {e}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Try without explicit path - let Selenium auto-detect
            try:
                logger.info("Attempting fallback: Service() without path...")
                service = Service()
                logger.info("Service created with auto-detection (fallback)")
                return service
            except Exception as e2:
                logger.error(f"Error with auto-detection: {e2}")
                logger.error(f"Exception type: {type(e2).__name__}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                
                # Last resort: try common Windows paths
                if platform.system() == "Windows":
                    logger.info("Trying common Windows paths...")
                    common_paths = [
                        os.path.join(os.path.expanduser("~"), ".wdm", "drivers", "chromedriver", "win64", "chromedriver.exe"),
                        os.path.join(os.path.expanduser("~"), ".wdm", "drivers", "chromedriver", "win32", "chromedriver.exe"),
                        r"C:\Program Files\Google\Chrome\Application\chromedriver.exe",
                        r"C:\Program Files (x86)\Google\Chrome\Application\chromedriver.exe",
                        "chromedriver.exe",  # In PATH
                    ]
                    for path in common_paths:
                        logger.info(f"Checking path: {path}")
                        if os.path.exists(path):
                            logger.info(f"Path exists: {path}")
                            try:
                                logger.info(f"Attempting to create Service with: {path}")
                                service = Service(path)
                                logger.info(f"Service created successfully with: {path}")
                                return service
                            except Exception as e3:
                                logger.error(f"Failed to create Service with {path}: {e3}")
                                logger.error(f"Exception type: {type(e3).__name__}")
                                continue
                        elif path == "chromedriver.exe":
                            logger.info("Trying chromedriver.exe from PATH...")
                            try:
                                service = Service(path)
                                logger.info("Service created successfully with chromedriver.exe from PATH")
                                return service
                            except Exception as e3:
                                logger.error(f"Failed to create Service with chromedriver.exe: {e3}")
                                continue
                        else:
                            logger.warning(f"Path does not exist: {path}")
                
                error_msg = (
                    f"ChromeDriver not found. Errors: {str(e)}; {str(e2)}. "
                    "Please ensure Chrome browser is installed and try: "
                    "pip install --upgrade webdriver-manager"
                )
                logger.error(error_msg)
                raise Exception(error_msg)
    
    def _login(self, driver: webdriver.Chrome) -> bool:
        """Login to LinkedIn"""
        try:
            driver.get("https://www.linkedin.com/login")
            time.sleep(2)
            
            # Enter email
            email_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "username"))
            )
            email_field.send_keys(self.linkedin_email)
            
            # Enter password
            password_field = driver.find_element(By.ID, "password")
            password_field.send_keys(self.linkedin_password)
            
            # Click login
            login_button = driver.find_element(By.XPATH, "//button[@type='submit']")
            login_button.click()
            
            # Wait for login to complete
            time.sleep(5)
            
            # Check if login was successful
            if "feed" in driver.current_url or "linkedin.com/in/" in driver.current_url:
                return True
            
            return False
        
        except Exception as e:
            print(f"Login error: {e}")
            return False
    
    def _search_profiles(self, driver: webdriver.Chrome, keywords: List[str], limit: int = 20) -> List[str]:
        """Search for profiles using keywords with pagination and return profile URLs"""
        try:
            # Build search query from all keywords
            search_query = "%20".join(keywords)
            
            # Build search URL - let LinkedIn handle location matching through keywords
            base_url = f"https://www.linkedin.com/search/results/people/?keywords={search_query}"
            
            logger.info(f"Searching with query: {search_query}, target: {limit} profiles")
            
            profile_urls = []
            page = 0
            max_pages = (limit // 10) + 2  # LinkedIn shows ~10 results per page
            
            while len(profile_urls) < limit and page < max_pages:
                # Navigate to search page
                if page == 0:
                    search_url = base_url
                else:
                    search_url = f"{base_url}&page={page + 1}"
                
                logger.info(f"Fetching page {page + 1}, current profiles: {len(profile_urls)}")
                driver.get(search_url)
                time.sleep(5)
                
                # Scroll to load more results
                for _ in range(3):
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(2)
                
                # Wait for results to load
                time.sleep(3)
                
                # Parse page with BeautifulSoup
                soup = BeautifulSoup(driver.page_source, 'html.parser')
                
                # Find profile links - multiple strategies
                page_urls = []
                
                # Strategy 1: Find links in search results
                result_links = soup.find_all('a', href=True)
                for link in result_links:
                    href = link.get('href', '')
                    if '/in/' in href and 'linkedin.com' in href:
                        # Clean and normalize URL
                        if href.startswith('/'):
                            full_url = f"https://www.linkedin.com{href}"
                        elif 'linkedin.com' in href:
                            full_url = href.split('?')[0]  # Remove query params
                        else:
                            continue
                        
                        # Validate it's a profile URL (not a company page)
                        if '/in/' in full_url and full_url not in profile_urls and full_url not in page_urls:
                            page_urls.append(full_url)
                
                # Strategy 2: Try to find via data attributes
                entities = soup.find_all('div', {'data-chameleon-result-urn': True})
                for entity in entities:
                    link = entity.find('a', href=True)
                    if link:
                        href = link.get('href', '')
                        if '/in/' in href:
                            full_url = href if href.startswith('http') else f"https://www.linkedin.com{href}"
                            full_url = full_url.split('?')[0]
                            if full_url not in profile_urls and full_url not in page_urls:
                                page_urls.append(full_url)
                
                # Add unique URLs from this page
                for url in page_urls:
                    if url not in profile_urls:
                        profile_urls.append(url)
                
                logger.info(f"Page {page + 1}: Found {len(page_urls)} new profiles, total: {len(profile_urls)}")
                
                # If no new profiles found on this page, stop pagination
                if len(page_urls) == 0:
                    logger.info("No more profiles found, stopping pagination")
                    break
                
                page += 1
            
            logger.info(f"Total profiles collected: {len(profile_urls)}")
            return list(set(profile_urls))[:limit]  # Remove duplicates and limit
        
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    def _scrape_profile(self, driver: webdriver.Chrome, profile_url: str) -> Dict:
        """Scrape individual profile data using Selenium for better accuracy"""
        try:
            driver.get(profile_url)
            time.sleep(4)  # Wait for page to load
            
            # Scroll to load dynamic content
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(1)
            
            # Extract name using Selenium
            name = "N/A"
            try:
                name_elem = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.TAG_NAME, "h1"))
                )
                name = name_elem.text.strip()
            except:
                try:
                    name_elem = driver.find_element(By.CSS_SELECTOR, "h1.text-heading-xlarge")
                    name = name_elem.text.strip()
                except:
                    pass
            
            # Extract title/headline using Selenium
            title = "N/A"
            try:
                title_elem = driver.find_element(By.CSS_SELECTOR, "div.text-body-medium.break-words")
                title = title_elem.text.strip()
            except:
                try:
                    title_elem = driver.find_element(By.CSS_SELECTOR, "div.text-body-medium")
                    title = title_elem.text.strip()
                except:
                    pass
            
            # Extract company from title if present
            company = "N/A"
            if " at " in title:
                company = title.split(" at ")[-1].strip()
            
            # Extract location using Selenium - look for location in top section
            location = "N/A"
            try:
                # Try multiple selectors for location - LinkedIn shows location in various formats
                location_selectors = [
                    "span.text-body-small.inline.t-black--light.break-words",
                    "div.text-body-small.inline.t-black--light.break-words",
                    "span.text-body-small",
                    "div.text-body-small",
                    "span[class*='text-body-small'][class*='t-black--light']",
                ]
                
                for selector in location_selectors:
                    try:
                        loc_elems = driver.find_elements(By.CSS_SELECTOR, selector)
                        for loc_elem in loc_elems:
                            text = loc_elem.text.strip()
                            # Check if it looks like a location:
                            # - Contains comma (city, country format)
                            # - Contains common location words
                            # - Not too long (locations are usually short)
                            # - Not the same as title or company
                            if (text and len(text) > 2 and len(text) < 100 and 
                                text != name and text != title and 
                                (',' in text or 
                                 any(word in text.lower() for word in 
                                    ['uae', 'dubai', 'abu dhabi', 'sharjah', 'emirates', 'saudi', 'qatar', 
                                     'kuwait', 'bahrain', 'oman', 'india', 'pakistan', 'bangladesh',
                                     'singapore', 'malaysia', 'thailand', 'indonesia', 'philippines',
                                     'london', 'new york', 'california', 'texas', 'toronto', 'sydney',
                                     'melbourne', 'united arab', 'united states', 'united kingdom',
                                     'city', 'region', 'area', 'state', 'province', 'country']))):
                                location = text
                                break
                        if location != "N/A":
                            break
                    except:
                        continue
            except Exception as e:
                logger.debug(f"Location extraction error: {e}")
            
            # Extract company from experience section if not found in title
            if company == "N/A":
                try:
                    # Scroll to experience section
                    driver.execute_script("window.scrollTo(0, 500);")
                    time.sleep(2)
                    
                    # Look for experience section
                    exp_section = driver.find_element(By.ID, "experience")
                    # Find the first company in experience
                    company_links = exp_section.find_elements(By.CSS_SELECTOR, "span[class*='t-14'][class*='t-normal'] a")
                    if company_links:
                        company = company_links[0].text.strip()
                except:
                    try:
                        # Alternative: look for company in experience using different selectors
                        exp_section = driver.find_element(By.ID, "experience")
                        company_spans = exp_section.find_elements(By.CSS_SELECTOR, "span[class*='mr1']")
                        if company_spans:
                            company = company_spans[0].text.strip()
                    except:
                        pass
            
            return {
                "name": name if name else "N/A",
                "title": title if title else "N/A",
                "company": company if company else "N/A",
                "location": location if location else "N/A"
            }
        
        except Exception as e:
            logger.error(f"Error scraping profile {profile_url}: {e}")
            return {
                "name": "N/A",
                "title": "N/A",
                "company": "N/A",
                "location": "N/A"
            }
    
    async def scrape_profiles(self, keywords: List[str], limit: int = 20, headless: bool = True) -> List[Dict]:
        """Main scraping method"""
        loop = asyncio.get_event_loop()
        
        def _scrape():
            driver = None
            try:
                logger.info("=" * 60)
                logger.info("Starting scraping process...")
                logger.info("Step 1: Getting Chrome options...")
                options = self._get_chrome_options(headless=headless)
                logger.info(f"Chrome options created successfully (headless={headless})")
                
                logger.info("Step 2: Getting Chrome service...")
                service = self._get_chrome_service()
                logger.info("Chrome service obtained")
                
                logger.info("Step 3: Creating Chrome WebDriver instance...")
                logger.info(f"Service executable: {getattr(service, 'service_args', 'N/A')}")
                driver = webdriver.Chrome(service=service, options=options)
                logger.info("Chrome WebDriver created successfully!")
                logger.info(f"Driver: {driver}")
                logger.info(f"Current URL: {driver.current_url}")
                
                # Login
                logger.info("Step 4: Attempting LinkedIn login...")
                if not self._login(driver):
                    logger.error("Login failed!")
                    raise Exception("Failed to login to LinkedIn")
                logger.info("Login successful!")
                
                # Search for profiles
                logger.info(f"Step 5: Searching for profiles with keywords: {keywords}")
                profile_urls = self._search_profiles(driver, keywords, limit=limit)
                logger.info(f"Found {len(profile_urls)} profile URLs")
                
                if not profile_urls:
                    logger.warning("No profile URLs found")
                    return []
                
                # Scrape each profile
                logger.info(f"Step 6: Scraping {min(limit, len(profile_urls))} profiles...")
                profiles = []
                for idx, url in enumerate(profile_urls[:limit], 1):
                    logger.info(f"Scraping profile {idx}/{min(limit, len(profile_urls))}: {url}")
                    profile_data = self._scrape_profile(driver, url)
                    profiles.append(profile_data)
                    logger.info(f"Profile {idx} scraped: {profile_data.get('name', 'N/A')}")
                    time.sleep(random.uniform(2, 4))  # Random delay to avoid detection
                
                logger.info(f"Successfully scraped {len(profiles)} profiles")
                return profiles
            
            except Exception as e:
                logger.error(f"Error in _scrape(): {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"Full traceback: {traceback.format_exc()}")
                raise
            finally:
                if driver:
                    logger.info("Closing WebDriver...")
                    driver.quit()
                    logger.info("WebDriver closed")
        
        profiles = await loop.run_in_executor(self.executor, _scrape)
        return profiles
    
    def save_to_csv(self, profiles: List[Dict], filename: str = "profiles.csv") -> str:
        """Save profiles to CSV file"""
        # Get the directory where the script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        filepath = os.path.join(script_dir, filename)
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['name', 'title', 'company', 'location']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for profile in profiles:
                writer.writerow({
                    'name': profile.get('name', 'N/A'),
                    'title': profile.get('title', 'N/A'),
                    'company': profile.get('company', 'N/A'),
                    'location': profile.get('location', 'N/A')
                })
        
        return filepath

