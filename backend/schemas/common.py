from typing import Optional

from pydantic import BaseModel, Field


class Component(BaseModel):
    unique_name: str = Field(..., alias="uniqueName")
    name: str
    description: str
    item_count: int = Field(..., alias="itemCount")
    image_name: str = Field(..., alias="imageName")
    tradable: bool
    masterable: bool
    drops: list["ComponentDrop"]
    type: str|None = None
    prime_selling_price: int|None = Field(None, alias="primeSellingPrice")
    ducats: int|None = Field(None, alias="ducats")
    exclude_from_codex: bool|None = Field(None, alias="excludeFromCodex")


class ComponentDrop(BaseModel):
    location: str
    type: str
    chance: float
    rarity: str
    unique_name: Optional[str] = Field(None, alias="uniqueName")


class Introduced(BaseModel):
    name: str
    url: str
    aliases: list[str]
    parent: str
    date: str


class Patchlog(BaseModel):
    name: str
    date: str
    url: str
    additions: str
    changes: str
    fixes: str