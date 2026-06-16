from typing import List, Optional
from pydantic import BaseModel, Field

class Ability(BaseModel):
    """Represents a Warframe ability."""

    ability_unique_name: str = Field(..., alias="abilityUniqueName")
    ability_name: str = Field(..., alias="abilityName")
    description: str


class Warframe(BaseModel):
    """Represents a Warframe character and its base statistics."""

    unique_name: str = Field(..., alias="uniqueName")
    name: str
    parent_name: str = Field(..., alias="parentName")
    description: str
    health: int
    shield: int
    armor: int
    stamina: int
    power: int
    codex_secret: bool = Field(..., alias="codexSecret")
    mastery_req: int = Field(..., alias="masteryReq")
    sprint_speed: float = Field(..., alias="sprintSpeed")
    abilities: List[Ability]
    product_category: str = Field(..., alias="productCategory")
    passive_description: Optional[str] = Field(None, alias="passiveDescription")
    exalted: Optional[List[str]] = None
    long_description: Optional[str] = Field(None, alias="longDescription")
