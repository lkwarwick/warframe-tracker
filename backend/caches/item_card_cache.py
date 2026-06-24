from backend.caches import ItemGroup, ItemCache
from backend.components import ItemCard
from dash import html
from backend.schemas import ItemUniqueName, Item
from typing import ClassVar


class ItemCardCache:
    
    # ------------------------------ Class Variables ----------------------------- #
    
    _CARDS: ClassVar[dict[ItemUniqueName, html.Div]] = {}
    """Stores pre-rendered item cards."""
    
    _ITEM_GROUP_CARDS: ClassVar[dict[ItemGroup, list[html.Div]]] = {}
    
    # ----------------------------- Private Functions ---------------------------- #
    
    @staticmethod
    def _get_card(item: Item) -> html.Div:
        card = ItemCardCache._CARDS.get(item.unique_name)
        
        if card is None:
            card = ItemCard(item).render()
            ItemCardCache._CARDS[item.unique_name] = card
    
        return card
    
    @staticmethod
    def rendered_item_cards(item_group: ItemGroup) -> list[html.Div]:
        cards = ItemCardCache._ITEM_GROUP_CARDS.get(item_group)
        
        if (not isinstance(cards, list)) and (cards is None):
            cards = [ItemCardCache._get_card(item) for item in ItemCache.fetch(item_group)]
            ItemCardCache._ITEM_GROUP_CARDS[item_group] = cards
        
        return cards