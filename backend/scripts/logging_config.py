# scripts/logging_config.py
import logging
from pathlib import Path


# setup_scraper_logging
def get_logger(scraper_name: str, log_level: str = "INFO") -> logging.Logger:
    """Simplified logging for thesis"""
    logger = logging.getLogger(scraper_name)

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s | %(name)s | %(message)s")
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger
