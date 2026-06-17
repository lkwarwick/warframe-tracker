from typing import List, Optional, Union
from pydantic import BaseModel, Field

class Ability(BaseModel):
    unique_name: str = Field(..., alias="uniqueName")
    name: str
    description: str
    image_name: str = Field(..., alias="imageName")

class ComponentDrop(BaseModel):
    location: str
    type: str
    chance: float
    rarity: str
    unique_name: Optional[str] = Field(None, alias="uniqueName")

class Component(BaseModel):
    unique_name: str = Field(..., alias="uniqueName")
    name: str
    description: str
    item_count: int = Field(..., alias="itemCount")
    image_name: str = Field(..., alias="imageName")
    tradable: bool
    masterable: bool
    drops: List[ComponentDrop]
    type: Optional[str] = None
    prime_selling_price: Optional[int] = Field(None, alias="primeSellingPrice")
    ducats: Optional[int] = Field(None, alias="ducats")
    exclude_from_codex: Optional[bool] = Field(None, alias="excludeFromCodex")

class Patchlog(BaseModel):
    name: str
    date: str
    url: str
    additions: str
    changes: str
    fixes: str

class Introduced(BaseModel):
    name: str
    url: str
    aliases: List[str]
    parent: str
    date: str

class Warframe(BaseModel):
    unique_name: str = Field(..., alias="uniqueName")
    name: str
    description: Optional[str] = None
    health: int
    shield: int
    armor: int
    stamina: int
    power: int
    mastery_req: Optional[int] = Field(None, alias="masteryReq")
    sprint_speed: Optional[float] = Field(None, alias="sprintSpeed")
    passive_description: Optional[str] = Field(None, alias="passiveDescription")
    exalted: Optional[List[str]] = None
    abilities: List[Ability]
    product_category: Optional[str] = Field(None, alias="productCategory")
    components: Optional[List[Component]] = None
    type: Optional[str] = None
    image_name: Optional[str] = Field(None, alias="imageName")
    category: Optional[str] = None
    tradable: bool
    isPrime: bool
    masterable: bool
    vaulted: Optional[bool] = None
    vault_date: Optional[str] = Field(None, alias="vaultDate")
    estimated_vault_date: Optional[str] = Field(None, alias="estimatedVaultDate")
    exilus_polarity: Optional[str] = Field(None, alias="exilusPolarity")
    drops: Optional[List[dict]] = None  # Simplified for brevity if not fully mapped
    aura: Optional[Union[str, List[str]]] = None
    conclave: Optional[bool] = None
    color: Optional[int] = None
    introduced: Optional[Introduced] = None
    market_cost: Optional[int] = Field(None, alias="marketCost")
    bp_cost: Optional[int] = Field(None, alias="bpCost")
    polarities: Optional[List[str]] = None
    sex: Optional[str] = None
    sprint: Optional[float] = None
    wikia_url: Optional[str] = Field(None, alias="wikiaUrl")
    release_date: Optional[str] = Field(None, alias="releaseDate")
    vaulted_date: Optional[str] = Field(None, alias="vaultedDate")

    def get_ingredients(self) -> List[dict]:
        if not self.components:
            return []
        return [{"name": c.name, "count": c.item_count} for c in self.components]
