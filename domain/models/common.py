from pydantic import BaseModel, Field
from typing import Optional


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