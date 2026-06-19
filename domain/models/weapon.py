"""Contains models/schemas relating to Weapon items."""

from __future__ import annotations

from pydantic import BaseModel, Field

from domain.models.common import Patchlog  # noqa: TC001
from domain.models.item import Item


class Damage(BaseModel):
    """A Weapon's damage statistics."""

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


class AttackDamage(BaseModel):
    """Attack damage element information."""

    impact: float | None = None
    slash: float | None = None
    puncture: float | None = None
    heat: int | None = None
    toxin: int | None = None
    radiation: int | None = None
    blast: int | None = None
    electricity: int | None = None
    magnetic: int | None = None
    viral: float | None = None
    corrosive: int | None = None
    cold: int | None = None
    void: int | None = None


class Falloff(BaseModel):
    """Damage falloff information."""

    start: float
    end: float
    reduction: float


class Attack(BaseModel):
    """Attack information."""

    name: str
    speed: float | None = None
    crit_chance: float
    crit_mult: float
    status_chance: float
    shot_type: str | None = None
    shot_speed: int | None = None
    flight: int | None = None
    damage: AttackDamage
    charge_time: float | None = None
    falloff: Falloff | None = None


class Weapon(Item):
    """A Weapon item in Warframe."""

    # Identity
    slot: int
    tags: list[str] | None = None

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
    magazine_size: int | None = Field(None, alias="magazineSize")
    reload_time: float = Field(..., alias="reloadTime")
    multishot: int
    attacks: list[Attack] | None = None

    # Build info
    build_price: int | None = Field(None, alias="buildPrice")
    build_time: int | None = Field(None, alias="buildTime")
    skip_build_time_price: int | None = Field(None, alias="skipBuildTimePrice")
    build_quantity: int | None = Field(None, alias="buildQuantity")
    consume_on_build: bool | None = Field(None, alias="consumeOnBuild")

    # Modding
    disposition: int | None = None

    # Wiki / meta
    wiki_available: bool | None = Field(None, alias="wikiAvailable")
    wikia_thumbnail: str | None = Field(None, alias="wikiaThumbnail")
    patchlogs: list[Patchlog] | None = None

    # Misc
    max_level_cap: int | None = Field(None, alias="maxLevelCap")
    item_count: int | None = Field(None, alias="itemCount")
    parents: list[str] | None = None
