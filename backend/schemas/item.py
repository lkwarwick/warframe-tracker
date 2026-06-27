"""Contains the base Item model/schema."""
from pydantic import BaseModel, Field

from backend.schemas.common import Component, ComponentDrop, Introduced  # noqa: TC001


type ItemUniqueName = str


class Item(BaseModel):
    """Base item in Warframe (i.e., Warframe, Weapon)."""

    # Generic
    unique_name: ItemUniqueName = Field(..., alias="uniqueName")
    name: str
    description: str | None = None
    is_prime: bool = Field(default=False, alias="isPrime")
    type: str | None = None
    image_name: str = Field(..., alias="imageName")
    category: str | None = None

    # Mastery / slot
    mastery_req: int | None = Field(None, alias="masteryReq")
    product_category: str | None = Field(None, alias="productCategory")

    drops: list[ComponentDrop] | None = None
    components: list[Component] | None = None
    bp_cost: int | None = Field(None, alias="bpCost")
    market_cost: int | None = Field(None, alias="marketCost")

    tradable: bool
    masterable: bool
    vaulted: bool | None = None
    vault_date: str | None = Field(None, alias="vaultDate")
    estimated_vault_date: str | None = Field(None, alias="estimatedVaultDate")

    # Modding
    polarities: list[str] | None = None
    exilus_polarity: str | None = Field(None, alias="exilusPolarity")

    introduced: Introduced | None = None
    wikia_url: str | None = Field(None, alias="wikiaUrl")
    release_date: str | None = Field(None, alias="releaseDate")
