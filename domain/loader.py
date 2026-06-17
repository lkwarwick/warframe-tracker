import requests
from domain.models.warframe import Warframe
from loguru import logger

WF_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json"


def load_warframes() -> list[Warframe]:
    logger.info("Loading warframes from remote source...")
    raw = requests.get(WF_URL, timeout=10).json()
    logger.info(f"Loaded {len(raw)} warframes from remote source.")
    return [Warframe.model_validate(x) for x in raw]