from typing import ClassVar
from dash import html

from backend.schemas.item import Item


class ItemCard:
        
    IMG_BASE: ClassVar[str] = "https://cdn.warframestat.us/img/"
    
    LAZY_PLACEHOLDER: ClassVar[str] = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
    
    def __init__(self, item: Item) -> None:
        self.item = item
    
    def render(self):
        """Render this item's item card"""
        # Grab components to tick off, or toggle button
        components = (self.item.components or ["Set as Completed"])[:5]

        return html.Div(
            className="card",
            **{
                "data-prime": "prime" if self.item.is_prime else "nonprime",
                "data-name": (self.item.name or "").lower(),
            },  # ty:ignore[invalid-argument-type]
            children=[
                html.Img(
                    src=ItemCard.LAZY_PLACEHOLDER,
                    **{"data-src": f"{ItemCard.IMG_BASE}{self.item.image_name}"},  # type: ignore
                    className="card-image lazy",
                    alt=self.item.name,
                ),
                html.H3(self.item.name, className="card-title"),
                html.Div(
                    className="card-checklist",
                    children=[
                        html.Div(
                            str(getattr(c, "name") if hasattr(c, "name") else c),
                            className="component-pill",
                            **{"data-wf": self.item.unique_name, "data-idx": str(idx)},  # ty:ignore[invalid-argument-type]
                        )
                        for idx, c in enumerate(components)
                    ],
                ),
            ],
        )