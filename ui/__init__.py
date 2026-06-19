"""Contains UI components and is the main source for reusable parts."""
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PySide6.QtWidgets import QWidget


def refresh_style(q: QWidget) -> None:
    """Force refresh a widget's styling against QSS."""
    q.style().unpolish(q)
    q.style().polish(q)
