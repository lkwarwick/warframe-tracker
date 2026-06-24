from enum import StrEnum

from backend.components.item_card import ItemCard

__all__ = ["ItemCard"]

class PrimeFilter(StrEnum):
    ALL = "All"
    PRIME_ONLY = "Prime Only"
    NON_PRIME_ONLY = "Non-Prime Only"
