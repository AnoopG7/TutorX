"""
Logger utilities.

NOTE: Root logging is configured in main.py via logging.basicConfig().
This module provides a helper to get correctly-named loggers.
Do NOT add handlers here — it conflicts with basicConfig.
"""
import logging


def get_logger(name: str) -> logging.Logger:
    """Get a named logger. Use __name__ as the argument."""
    return logging.getLogger(name)
