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
    ROBOTIC = "Robotic"
    COMPANIONS = "Companions"
    VEHICLES = "Vehicles"
    ARCHGUNS = "Archguns"
    ARCHMELEE = "Archmelee"
    AMPS = "Amps"
    UNCATEGORIZED = "Uncategorized"

    @classmethod
    def from_item(cls, item: Item) -> list["ItemGroup"]:
        # K-Drives
        if item.type == "K-Drive Component":
            return [cls.VEHICLES]
        
        # Kitguns
        if (("InfKitGun" in item.unique_name) or (item.type == "Kitgun Component")) and ("Barrel" in item.unique_name):
            return [cls.PRIMARIES, cls.SECONDARIES]
        
        # Amps
        if ((item.type == "Amp") and ("Barrel" in item.unique_name)) or (item.name == "Sirocco"):
            return [cls.AMPS]
        
        # Robotic
        if (item.product_category in ["SentinelWeapons", "Sentinels"]) or ((item.type == "Pets") and ("ZanukaPets" in item.unique_name)) or ((item.type == "Pets") and ("MoaPets" in item.unique_name)):
            return [cls.ROBOTIC]
        
        # Companions
        if ((item.type == "Pets") and (item.product_category == "KubrowPets")):
            return [cls.COMPANIONS]
        
        # Warframes
        if item.product_category == "Suits":
            return [cls.WARFRAMES]

        # Primary
        if item.category == "Primary":
            return [cls.PRIMARIES]
        
        # Secondary
        if item.category == "Secondary":
            return [cls.SECONDARIES]

        # Melee
        if item.category == "Melee":
            return [cls.MELEE]
        
        # Vehicles
        if item.product_category == "MechSuits":
            return [cls.VEHICLES]
        
        # Archguns
        if item.category == "Arch-Gun":
            return [cls.ARCHGUNS]
        
        # Archmelee
        if item.category == "Arch-Melee":
            return [cls.ARCHMELEE]
        
        # Archwing
        if item.category == "Archwing":
            return [cls.VEHICLES]
        
        logger.warning(f"Failed to categorize: {item.name} ({item.unique_name})")
        
        return [cls.UNCATEGORIZED]
    
    def to_icon(self) -> str:
        """Grab a phosphor icon, based on the item group."""
        if self == ItemGroup.ALL:
            return "ph-squares-four"
        
        if self == ItemGroup.WARFRAMES:
            return "ph-user"
        
        if self == ItemGroup.PRIMARIES:
            return "ph-crosshair"
        
        if self == ItemGroup.SECONDARIES:
            return "ph-circle"
        
        if self == ItemGroup.MELEE:
            return "ph-sword"
        
        if self == ItemGroup.ROBOTIC:
            return "ph-cpu"
        
        if self == ItemGroup.COMPANIONS:
            return "ph-paw-print"
        
        if self == ItemGroup.VEHICLES:
            return "ph-car"
        
        if self == ItemGroup.ARCHGUNS:
            return "ph-target"
        
        if self == ItemGroup.ARCHMELEE:
            return "ph-axe"
        
        if self == ItemGroup.AMPS:
            return "ph-lightning"
        
        return "ph-question"


class ItemCache:
    BLACKLIST: ClassVar[set[str]] = {
        "/Lotus/Powersuits/PowersuitAbilities/Helminth",  # Not an actual Item
        "/Lotus/Powersuits/SiriusOrion/OrionSuit",  # Game uses "SiriusSuit"
        "/Lotus/Powersuits/Excalibur/ExcaliburPrime",  # Founders
        "/Lotus/Weapons/Tenno/Pistol/LatoPrime",  # Founders
        "/Lotus/Weapons/Tenno/Melee/LongSword/SkanaPrime",  # Founders
        "/Lotus/Weapons/Tenno/Grimoire/TnDoppelgangerGrimoire",  # Doppelganger Grimoire
    }
    
    @staticmethod
    def _is_relevant_misc_item(obj: dict) -> bool:
        """Extra filter applied only to Misc.json entries."""
        # K-Drives
        if (obj.get("type") == "K-Drive Component") and (obj.get("masterable")):
            return True
        
        # Kitguns
        if (("InfKitGun" in obj.get("uniqueName", "")) or (obj.get("type") == "Kitgun Component")) and ("Barrel" in obj.get("uniqueName", "")):
            return True
        
        # Amps
        if (obj.get("type") == "Amp") and ("Barrel") in obj.get("uniqueName", ""):
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
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Archwing.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Sentinels.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/SentinelWeapons.json", _is_masterable),
        ("https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Pets.json", _is_masterable),
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

        items = [item for item in cls.fetch_all() if group in ItemGroup.from_item(item)]
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