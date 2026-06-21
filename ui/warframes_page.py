"""Contains the Warframe display page."""
from typing import TYPE_CHECKING

from ui.item_page import ItemsPage

if TYPE_CHECKING:
    from domain.models import Warframe
    from infra.image_loader import ImageLoader
    from state.store import Store


class WarframesPage(ItemsPage):
    """Contains the layout for the Warframes page."""

    def __init__(self, items: list[Warframe], store: Store, loader: ImageLoader) -> None:
        super().__init__(items, store, loader)
