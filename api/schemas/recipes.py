from typing import List, Optional
from pydantic import BaseModel, Field

class Ingredient(BaseModel):
    """Represents a component required to craft an item."""

    item_type: str = Field(..., alias="ItemType")
    item_count: int = Field(..., alias="ItemCount")
    product_category: str = Field(..., alias="ProductCategory")


class SecretIngredient(BaseModel):
    """Represents a hidden component required to craft an item."""

    item_type: str = Field(..., alias="ItemType")
    item_count: int = Field(..., alias="ItemCount")


class Blueprint(BaseModel):
    """Represents a Warframe crafting recipe and its requirements."""

    unique_name: str = Field(..., alias="uniqueName")
    result_type: str = Field(..., alias="resultType")
    build_price: int = Field(..., alias="buildPrice")
    build_time: int = Field(..., alias="buildTime")
    skip_build_time_price: int = Field(..., alias="skipBuildTimePrice")
    consume_on_use: bool = Field(..., alias="consumeOnUse")
    num: int
    codex_secret: bool = Field(..., alias="codexSecret")
    ingredients: List[Ingredient]
    secret_ingredients: List[SecretIngredient] = Field(..., alias="secretIngredients")
    exclude_from_codex: Optional[bool] = Field(None, alias="excludeFromCodex")
    prime_selling_price: Optional[int] = Field(None, alias="primeSellingPrice")
    always_available: Optional[bool] = Field(None, alias="alwaysAvailable")
