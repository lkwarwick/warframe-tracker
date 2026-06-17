"""
Pydantic models generated from the Warframe weapons JSON schema.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field

from domain.models.common import ComponentDrop, Introduced, Patchlog


# ---------------------------------------------------------------------------
# Shared / nested models
# ---------------------------------------------------------------------------

class Damage(BaseModel):
    total: float
    impact: float = 0
    puncture: float = 0
    slash: float = 0
    heat: float = 0
    cold: float = 0
    electricity: float = 0
    toxin: float = 0
    blast: float = 0
    radiation: float = 0
    gas: float = 0
    magnetic: float = 0
    viral: float = 0
    corrosive: float = 0
    void: float = 0
    tau: float = 0
    cinematic: float = 0
    shield_drain: float = Field(0, alias="shieldDrain")
    health_drain: float = Field(0, alias="healthDrain")
    energy_drain: float = Field(0, alias="energyDrain")
    true: float = 0

    model_config = {"populate_by_name": True}


class AttackDamage(BaseModel):
    impact: Optional[float] = None
    slash: Optional[float] = None
    puncture: Optional[float] = None
    heat: Optional[int] = None
    toxin: Optional[int] = None
    radiation: Optional[int] = None
    blast: Optional[int] = None
    electricity: Optional[int] = None
    magnetic: Optional[int] = None
    viral: Optional[float] = None
    corrosive: Optional[int] = None
    cold: Optional[int] = None
    void: Optional[int] = None

    model_config = {"populate_by_name": True}


class Falloff(BaseModel):
    start: float
    end: float
    reduction: float


class Attack(BaseModel):
    name: str
    speed: Optional[float] = None
    crit_chance: float = Field(..., alias="crit_chance")
    crit_mult: float = Field(..., alias="crit_mult")
    status_chance: float = Field(..., alias="status_chance")
    shot_type: Optional[str] = Field(None, alias="shot_type")
    shot_speed: Optional[int] = Field(None, alias="shot_speed")
    flight: Optional[int] = None
    damage: AttackDamage
    charge_time: Optional[float] = Field(None, alias="charge_time")
    falloff: Optional[Falloff] = None

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Component models (nested up to 3 levels deep in the schema)
# ---------------------------------------------------------------------------

class ComponentLevel3(BaseModel):
    """Deepest nesting level — no sub-components."""
    unique_name: str = Field(..., alias="uniqueName")
    name: str
    description: str
    item_count: int = Field(..., alias="itemCount")
    image_name: str = Field(..., alias="imageName")
    tradable: bool
    masterable: bool
    drops: list[ComponentDrop] = Field(default_factory=list)
    type: Optional[str] = None

    model_config = {"populate_by_name": True}


class ComponentLevel2(BaseModel):
    """Second nesting level — may contain ComponentLevel3 children."""
    unique_name: str = Field(..., alias="uniqueName")
    name: str
    description: str
    item_count: int = Field(..., alias="itemCount")
    image_name: str = Field(..., alias="imageName")
    tradable: bool
    masterable: bool
    drops: list[ComponentDrop] = Field(default_factory=list)
    type: Optional[str] = None
    components: Optional[list[ComponentLevel3]] = None

    # Build info
    build_price: Optional[int] = Field(None, alias="buildPrice")
    build_time: Optional[int] = Field(None, alias="buildTime")
    skip_build_time_price: Optional[int] = Field(None, alias="skipBuildTimePrice")
    build_quantity: Optional[int] = Field(None, alias="buildQuantity")
    consume_on_build: Optional[bool] = Field(None, alias="consumeOnBuild")

    model_config = {"populate_by_name": True}


class Component(BaseModel):
    """Top-level component of a weapon — may contain ComponentLevel2 children."""
    unique_name: str = Field(..., alias="uniqueName")
    name: str
    description: str
    item_count: int = Field(..., alias="itemCount")
    image_name: str = Field(..., alias="imageName")
    tradable: bool
    masterable: bool
    drops: list[ComponentDrop] = Field(default_factory=list)
    type: Optional[str] = None
    components: Optional[list[ComponentLevel2]] = None

    # Build info
    build_price: Optional[int] = Field(None, alias="buildPrice")
    build_time: Optional[int] = Field(None, alias="buildTime")
    skip_build_time_price: Optional[int] = Field(None, alias="skipBuildTimePrice")
    build_quantity: Optional[int] = Field(None, alias="buildQuantity")
    consume_on_build: Optional[bool] = Field(None, alias="consumeOnBuild")

    # Trading / market
    prime_selling_price: Optional[int] = Field(None, alias="primeSellingPrice")
    ducats: Optional[int] = None
    exclude_from_codex: Optional[bool] = Field(None, alias="excludeFromCodex")

    # Weapon stats (some components are themselves weapons, e.g. kitguns)
    damage_per_shot: Optional[list[float]] = Field(None, alias="damagePerShot")
    total_damage: Optional[int] = Field(None, alias="totalDamage")
    critical_chance: Optional[float] = Field(None, alias="criticalChance")
    critical_multiplier: Optional[float] = Field(None, alias="criticalMultiplier")
    proc_chance: Optional[float] = Field(None, alias="procChance")
    fire_rate: Optional[float] = Field(None, alias="fireRate")
    mastery_req: Optional[int] = Field(None, alias="masteryReq")
    product_category: Optional[str] = Field(None, alias="productCategory")
    slot: Optional[int] = None
    accuracy: Optional[float] = None
    omega_attenuation: Optional[float] = Field(None, alias="omegaAttenuation")
    noise: Optional[str] = None
    trigger: Optional[str] = None
    magazine_size: Optional[int] = Field(None, alias="magazineSize")
    reload_time: Optional[float] = Field(None, alias="reloadTime")
    multishot: Optional[int] = None
    damage: Optional[Damage] = None
    attacks: Optional[list[Attack]] = None

    # Market
    market_cost: Optional[int] = Field(None, alias="marketCost")
    bp_cost: Optional[int] = Field(None, alias="bpCost")

    # Modding
    polarities: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    exilus_polarity: Optional[str] = Field(None, alias="exilusPolarity")

    # Wiki
    wiki_available: Optional[bool] = Field(None, alias="wikiAvailable")
    wikia_thumbnail: Optional[str] = Field(None, alias="wikiaThumbnail")
    wikia_url: Optional[str] = Field(None, alias="wikiaUrl")

    # Meta
    introduced: Optional[Introduced] = None
    disposition: Optional[int] = None
    release_date: Optional[str] = Field(None, alias="releaseDate")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Top-level weapon model
# ---------------------------------------------------------------------------

class Weapon(BaseModel):
    # Identity
    name: str
    unique_name: str = Field(..., alias="uniqueName")
    description: str
    type: str
    category: str
    image_name: str = Field(..., alias="imageName")

    # Core stats
    damage_per_shot: list[float] = Field(..., alias="damagePerShot")
    total_damage: float = Field(..., alias="totalDamage")
    damage: Damage
    critical_chance: float = Field(..., alias="criticalChance")
    critical_multiplier: float = Field(..., alias="criticalMultiplier")
    proc_chance: float = Field(..., alias="procChance")
    fire_rate: float = Field(..., alias="fireRate")
    accuracy: float
    omega_attenuation: float = Field(..., alias="omegaAttenuation")
    noise: str
    trigger: str
    magazine_size: Optional[int] = Field(None, alias="magazineSize")
    reload_time: float = Field(..., alias="reloadTime")
    multishot: int

    # Mastery / slot
    mastery_req: int = Field(..., alias="masteryReq")
    product_category: str = Field(..., alias="productCategory")
    slot: int

    # Flags
    is_prime: bool = Field(..., alias="isPrime")
    masterable: bool
    tradable: bool
    vaulted: Optional[bool] = None
    vault_date: Optional[str] = Field(None, alias="vaultDate")
    estimated_vault_date: Optional[str] = Field(None, alias="estimatedVaultDate")

    # Build info
    build_price: Optional[int] = Field(None, alias="buildPrice")
    build_time: Optional[int] = Field(None, alias="buildTime")
    skip_build_time_price: Optional[int] = Field(None, alias="skipBuildTimePrice")
    build_quantity: Optional[int] = Field(None, alias="buildQuantity")
    consume_on_build: Optional[bool] = Field(None, alias="consumeOnBuild")

    # Components / crafting
    components: Optional[list[Component]] = None
    bp_cost: Optional[int] = Field(None, alias="bpCost")

    # Modding
    polarities: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    exilus_polarity: Optional[str] = Field(None, alias="exilusPolarity")
    disposition: Optional[int] = None

    # Attacks
    attacks: Optional[list[Attack]] = None

    # Market
    market_cost: Optional[int] = Field(None, alias="marketCost")

    # Wiki / meta
    wiki_available: Optional[bool] = Field(None, alias="wikiAvailable")
    wikia_thumbnail: Optional[str] = Field(None, alias="wikiaThumbnail")
    wikia_url: Optional[str] = Field(None, alias="wikiaUrl")
    introduced: Optional[Introduced] = None
    patchlogs: Optional[list[Patchlog]] = None
    release_date: Optional[str] = Field(None, alias="releaseDate")

    # Misc
    max_level_cap: Optional[int] = Field(None, alias="maxLevelCap")
    item_count: Optional[int] = Field(None, alias="itemCount")
    parents: Optional[list[str]] = None
    drops: Optional[list[ComponentDrop]] = None

    model_config = {"populate_by_name": True}