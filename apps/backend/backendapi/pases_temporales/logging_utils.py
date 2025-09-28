# backendapi/pases_temporales/logging_utils.py
import logging

logger = logging.getLogger("pases_temporales")
logger.setLevel(logging.INFO)

def log_event(event: str, **kwargs):
    kv = " ".join(f"{k}={v}" for k, v in kwargs.items())
    logger.info(f"[{event}] {kv}")
