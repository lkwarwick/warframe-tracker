from typing import Optional
from pydantic import BaseModel, Field

class ResourceItem(BaseModel):
    unique_name: str = Field(alias="uniqueName")
    name: str
    description: str
    codex_secret: bool = Field(alias="codexSecret")
    parent_name: str = Field(alias="parentName")
    exclude_from_codex: Optional[bool] = Field(None, alias="excludeFromCodex")
    show_in_inventory: Optional[bool] = Field(None, alias="showInInventory")
    long_description: Optional[str] = Field(None, alias="longDescription")
    prime_selling_price: Optional[int] = Field(None, alias="primeSellingPrice")
