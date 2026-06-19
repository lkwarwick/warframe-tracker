"""Contains loader functions to load items."""
import requests
from loguru import logger

from domain.models.warframe import Warframe
from domain.models.weapon import Weapon

WF_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json"
PRIMARY_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/refs/heads/master/data/json/Primary.json"


def load_warframes() -> list[Warframe]:
    """Load Warframes from the remote source."""
    logger.info("Loading warframes from remote source...")
    raw = requests.get(WF_URL, timeout=10).json()
    logger.info(f"Loaded {len(raw)} warframes from remote source.")
    return [Warframe.model_validate(x) for x in raw if x.get("uniqueName") != "/Lotus/Powersuits/PowersuitAbilities/Helminth"]


def load_primaries() -> list[Weapon]:
    """Load primaries from the remote source."""
    logger.info("Loading primaries from remote source...")
    raw = requests.get(PRIMARY_URL, timeout=10).json()
    logger.info(f"Loaded {len(raw)} primaries from remote source.")
    return [Weapon.model_validate(x) for x in raw]
