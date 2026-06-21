"""Contains the Primary Weapons display page."""
from typing import TYPE_CHECKING

from ui.item_page import ItemsPage

if TYPE_CHECKING:
    from domain.models import Weapon
    from infra.image_loader import ImageLoader
    from state.store import Store


class PrimaryPage(ItemsPage):
    """Contains the layout for the Warframes page."""

    def __init__(self, items: list[Weapon], store: Store, loader: ImageLoader) -> None:
        super().__init__(items, store, loader)
