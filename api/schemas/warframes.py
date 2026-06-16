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

if __name__ == "__main__":
    import json
    from pathlib import Path

    # The data file is in the project root's data directory
    # api/schemas/new_warframes.py -> ../../data/WFCD_Warframes.json
    data_path = Path(__file__).resolve().parents[2] / "data" / "WFCD_Warframes.json"
    
    with open(data_path, "r") as f:
        data = json.load(f)
    
    gyre_prime_dict = next((item for item in data if item.get("name") == "Gyre Prime"), None)
    
    if gyre_prime_dict:
        try:
            gyre_prime = Warframe.model_validate(gyre_prime_dict)
            print(gyre_prime.model_dump_json(indent=2))
        except Exception as e:
            print(f"Error validating Gyre Prime: {e}")
            # If validation fails, just print the dict as JSON
            print(json.dumps(gyre_prime_dict, indent=2))
    else:
        print("Gyre Prime not found in data.")
