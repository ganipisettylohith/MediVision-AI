import logging
import sys


def setup_logging():
    """
    Configures application-wide logging with standardized timestamp, log-level, and module formatting.
    """
    log_format = "%(asctime)s [%(levelname)s] %(name)s (%(lineno)d): %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    # Silence overly verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logger = logging.getLogger("medivision")
    logger.info("Logging system initialized successfully.")
    return logger
