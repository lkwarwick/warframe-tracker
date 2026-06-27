from concurrent.futures import ThreadPoolExecutor
import requests
from enum import StrEnum
from typing import ClassVar, Callable

from loguru import logger
from backend.schemas.item import Item


class ItemGroup(StrEnum):
    ALL = "All"
    WARFRAMES = "Warframes"
    PRIMARIES = "Primary"
    SECONDARIES = "Secondary"
    MELEE = "Melee"
    VEHICLES = "Vehicles"
    ARCHGUNS = "Archguns"
    ARCHMELEE = "Archmelee"

    @classmethod
    def from_item(cls, item: Item) -> "ItemGroup":
        # K-Drives
        if item.type == "K-Drive Component":
            return cls.VEHICLES
        
        # Kitguns
        if (("InfKitGun" in item.unique_name) or (item.type == "Kitgun Component")) and ("Barrel" in item.unique_name):
            return cls.PRIMARIES
        
        # Warframes
        if item.product_category == "Suits":
            return cls.WARFRAMES

        # Primary
        if item.category == "Primary":
            return cls.PRIMARIES
        
        # Secondary
        if item.category == "Secondary":
            return cls.SECONDARIES

        # Melee
        if item.category == "Melee":
            return cls.MELEE
        
        # Vehicles
        if item.product_category == "MechSuits":
            return cls.VEHICLES
        
        # Archguns
        if item.category == "Arch-Gun":
            return cls.ARCHGUNS
        
        # Archmelee
        if item.category == "Arch-Melee":
            return cls.ARCHMELEE
        
        logger.warning(f"Failed to categorize: {item.name} ({item.unique_name})")
        
        return cls.ALL


class ItemCache:
    BLACKLIST: ClassVar[set[str]] = {
        "/Lotus/Powersuits/PowersuitAbilities/Helminth",  # Not an actual Item
        "/Lotus/Powersuits/SiriusOrion/OrionSuit",  # Game uses "SiriusSuit"
        "/Lotus/Powersuits/Excalibur/ExcaliburPrime",  # Founders
        "/Lotus/Weapons/Tenno/Pistol/LatoPrime",  # Founders
        "/Lotus/Weapons/Tenno/Melee/LongSword/SkanaPrime",  # Founders
    }
    
    @staticmethod
    def _is_relevant_misc_item(obj: dict) -> bool:
        """Extra filter applied only to Misc.json entries."""
        # K-Drives
        if (obj.get("type") == "K-Drive Component") and (obj.get("masterable")):
            logger.success(obj.get("name"))
            return True
        
        # Kitguns
        if (("InfKitGun" in obj.get("uniqueName", "")) or (obj.get("type") == "Kitgun Component")) and ("Barrel" in obj.get("uniqueName", "")):
            logger.success(obj.get("name"))
            return True
        
        return False
    
    @staticmethod
    def _is_masterable(obj: dict) -> bool:
        """Extra filter applied to the cleaner sources."""
        return obj.get("masterable", False)

    # Each source is (url, extra_filter). extra_filter runs ON TOP OF the
    # blacklist + masterable check, scoped to that source only. None = no extra filter.
    SOURCES: ClassVar[list[tuple[str, Callable[[dict], bool] | None]]] = [
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Primary.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/refs/heads/master/data/json/Secondary.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/refs/heads/master/data/json/Melee.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arch-Gun.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arch-Melee.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Misc.json", _is_relevant_misc_item),
    ]

    _ALL_ITEMS: ClassVar[list[Item] | None] = None
    _GROUP_CACHE: ClassVar[dict[ItemGroup, list[Item]]] = {}

    @staticmethod
    def _fetch_url(url: str, extra_filter: Callable[[dict], bool] | None) -> list[Item]:
        return [
            Item.model_validate(obj)
            for obj in requests.get(url, timeout=10).json()
            if (
                (obj.get("uniqueName") not in ItemCache.BLACKLIST)
                and (extra_filter is None or extra_filter(obj))
            )
        ]

    @classmethod
    def fetch_all(cls) -> list[Item]:
        if cls._ALL_ITEMS is not None:
            return cls._ALL_ITEMS

        seen: set[str] = set()
        all_items: list[Item] = []

        with ThreadPoolExecutor() as executor:
            urls = [u for u, _ in cls.SOURCES]
            filters = [f for _, f in cls.SOURCES]
            for items in executor.map(cls._fetch_url, urls, filters):
                for item in items:
                    key = item.unique_name or item.name
                    if key and key not in seen:
                        seen.add(key)
                        all_items.append(item)

        all_items = sorted(all_items, key=lambda i: (i.name or "").lower())
        cls._ALL_ITEMS = all_items
        logger.info(f"Loaded {len(all_items):,} items into cache")
        return all_items

    @classmethod
    def fetch(cls, group: ItemGroup) -> list[Item]:
        """Get items belonging to a given group, classifying via ItemGroup.from_item."""
        if group == ItemGroup.ALL:
            return cls.fetch_all()

        if group in cls._GROUP_CACHE:
            return cls._GROUP_CACHE[group]

        items = [item for item in cls.fetch_all() if ItemGroup.from_item(item) == group]
        cls._GROUP_CACHE[group] = items
        logger.info(f"Loaded {len(items):,} '{group}' into cache")
        return items

    @staticmethod
    def fetch_by_unique_name(unique_name: str) -> Item | None:
        return next(
            (item for item in ItemCache.fetch_all() if item.unique_name == unique_name),
            None,
        )

    @classmethod
    def preload(cls) -> None:
        cls.fetch_all()