import sys
from scripts.scrapers.scrape_ab import scrape_ab
from scripts.scrapers.scrape_bazaar import scrape_bazaar
from scripts.scrapers.scrape_marketin import scrape_marketin
from scripts.scrapers.scrape_masoutis import scrape_masoutis
from scripts.scrapers.scrape_mymarket import scrape_mymarket
from scripts.scrapers.scrape_sklavenitis import scrape_sklavenitis
from scripts.scrapers.scraper_helpers import upload_scraped_products
from concurrent.futures import ThreadPoolExecutor, as_completed
from scripts.logging_config import get_logger


class ScraperError(Exception):
    """Custom exception for scraper failures"""

    pass


def safe_scrape(scrape_func, shop_name, starting_page=1, max_page=150):
    logger = get_logger(shop_name)
    logger.info("Scraping started.")

    try:
        products = scrape_func(logger=logger, starting_page=starting_page, max_page=max_page)

        logger.info(f"Scraped {len(products)} products.")
        upload_scraped_products(products, shop_name, logger=logger)

    except Exception as e:
        logger.exception(f"[{shop_name}] Scraper failed with error: {e}")
        # Re-raise the exception so ThreadPoolExecutor can catch it
        raise ScraperError(f"[{shop_name}] {str(e)}")
    else:
        logger.info("Scraping completed successfully.")
    finally:
        logger.info(f"Scraper session ended.\n{'-' * 160}")


def test():
    failed = False
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [
            executor.submit(safe_scrape, scrape_ab, "ab", 1, 2),
            executor.submit(safe_scrape, scrape_bazaar, "bazaar", 1, 2),
            executor.submit(safe_scrape, scrape_marketin, "marketin", 1, 2),
            executor.submit(safe_scrape, scrape_masoutis, "masoutis", 1, 2),
            executor.submit(safe_scrape, scrape_mymarket, "mymarket", 1, 2),
            executor.submit(safe_scrape, scrape_sklavenitis, "sklavenitis", 1, 2),
        ]

        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"A scraper failed: {e}")
                failed = True

    if failed:
        sys.exit(1)
    else:
        print("[run_scrapers][INFO] All scrapers finished successfully.")


def full():
    failed = False
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [
            executor.submit(safe_scrape, scrape_ab, "ab", 1, 200),
            executor.submit(safe_scrape, scrape_bazaar, "bazaar", 1, 150),
            executor.submit(safe_scrape, scrape_marketin, "marketin", 1, 150),
            executor.submit(safe_scrape, scrape_masoutis, "masoutis", 1, 250),
            executor.submit(safe_scrape, scrape_mymarket, "mymarket", 1, 150),
            executor.submit(safe_scrape, scrape_sklavenitis, "sklavenitis", 1, 180),
        ]

        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"A scraper failed: {e}")
                failed = True

    if failed:
        sys.exit(1)
    else:
        print("[run_scrapers][INFO] All scrapers finished successfully.")


def single_shop(shop_num):
    """Run scraper for a single shop with full page limits"""
    scrapers = {
        1: (scrape_ab, "ab", 1, 200),
        2: (scrape_bazaar, "bazaar", 1, 30),
        3: (scrape_marketin, "marketin", 1, 30),
        4: (scrape_masoutis, "masoutis", 1, 250),
        5: (scrape_mymarket, "mymarket", 1, 50),
        6: (scrape_sklavenitis, "sklavenitis", 1, 180),
    }

    if shop_num not in scrapers:
        print(f"Invalid shop number: {shop_num}")
        print("Valid shop numbers:")
        print(" 1 - ab")
        print(" 2 - bazaar")
        print(" 3 - marketin")
        print(" 4 - masoutis")
        print(" 5 - mymarket")
        print(" 6 - sklavenitis")
        sys.exit(1)

    scrape_func, shop_name, start_page, max_page = scrapers[shop_num]

    try:
        print(f"Starting scraper for {shop_name}...")
        safe_scrape(scrape_func, shop_name, start_page, max_page)
        print(f"[run_scrapers][INFO] {shop_name} scraper finished successfully.")
    except Exception as e:
        print(f"{shop_name} scraper failed: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.run_scrapers <action>")
        print("Actions:")
        print(" 0 - test all shops (limited pages)")
        print(" 1 - ab only")
        print(" 2 - bazaar only")
        print(" 3 - marketin only")
        print(" 4 - masoutis only")
        print(" 5 - mymarket only")
        print(" 6 - sklavenitis only")
        print(" 99 - full (all shops)")

        sys.exit(1)

    action = sys.argv[1]

    match action:
        case "0":
            test()
        case "1":
            single_shop(1)
        case "2":
            single_shop(2)
        case "3":
            single_shop(3)
        case "4":
            single_shop(4)
        case "5":
            single_shop(5)
        case "6":
            single_shop(6)
        case "99":
            full()
        case _:
            print("Unknown action")


if __name__ == "__main__":
    main()
