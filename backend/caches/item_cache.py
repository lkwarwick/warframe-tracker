import requests
from enum import StrEnum
from typing import ClassVar

from loguru import logger
from backend.schemas.item import Item


class ItemGroup(StrEnum):
    WARFRAMES = "warframes"
    PRIMARIES = "primaries"
    SECONDARIES = "secondaries"
    MELEE = "melee"
    ARCHWING = "archwing"


class ItemCache:
    BLACKLIST: ClassVar[set[str]] = {
        "/Lotus/Powersuits/PowersuitAbilities/Helminth",
    }

    _CACHE: ClassVar[dict[ItemGroup, list[Item]]] = {}

    _URLS: ClassVar[dict[ItemGroup, list[str]]] = {
        ItemGroup.WARFRAMES: [
            "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json"
        ],
        ItemGroup.PRIMARIES: [
            "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Primary.json"
        ],
        ItemGroup.SECONDARIES: [
            "https://raw.githubusercontent.com/WFCD/warframe-items/refs/heads/master/data/json/Secondary.json"
        ],
        ItemGroup.MELEE: [
            "https://raw.githubusercontent.com/WFCD/warframe-items/refs/heads/master/data/json/Melee.json"
        ],
        ItemGroup.ARCHWING: [
            "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Archwing.json",
            "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arch-Gun.json",
            "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arch-Melee.json",
        ],
    }

    @staticmethod
    def fetch(group: ItemGroup) -> list[Item]:
        if group in ItemCache._CACHE:
            return ItemCache._CACHE[group]

        items = [
            Item.model_validate(obj)
            for url in ItemCache._URLS[group]
            for obj in requests.get(url, timeout=10).json()
            if obj.get("uniqueName") not in ItemCache.BLACKLIST
        ]

        items = sorted(items, key=lambda i: (i.name or "").lower())

        ItemCache._CACHE[group] = items
        logger.debug("Loaded %s into cache", group.value)

        return items

    @staticmethod
    def preload() -> None:
        for group in ItemGroup:
            ItemCache.fetch(group)