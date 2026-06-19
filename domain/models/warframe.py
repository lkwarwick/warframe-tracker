"""Contains the Warframe model/schema."""
from pydantic import BaseModel, Field

from domain.models.item import Item


class Ability(BaseModel):
    """A Warframe's ability."""

    unique_name: str = Field(..., alias="uniqueName")
    name: str
    description: str
    image_name: str = Field(..., alias="imageName")


class Warframe(Item):
    """Warframe item in Warframe (duh)."""

    # Core Stats
    health: int
    shield: int
    armor: int
    stamina: int
    power: int
    sprint: float | None = None
    sprint_speed: float | None = Field(None, alias="sprintSpeed")

    # Abilities
    passive_description: str | None = Field(None, alias="passiveDescription")
    exalted: list[str] | None = None
    abilities: list[Ability]

    # Modding
    aura: str | list[str] | None = None

    # Misc
    conclave: bool | None = None
    color: int | None = None
    sex: str | None = None
    vaulted_date: str | None = Field(None, alias="vaultedDate")

