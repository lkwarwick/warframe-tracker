"""Contains the helper function to build a search bar."""
from enum import Enum
from typing import TYPE_CHECKING

from PySide6.QtWidgets import QHBoxLayout, QLineEdit, QPushButton, QWidget

if TYPE_CHECKING:
    from collections.abc import Callable


class PrimeFilterMode(Enum):
    """Filter mode to show all items, only Prime items, or only Normal items."""

    ALL = "all"
    PRIMES = "primes"
    NORMAL = "normal"


def build_toolbar(
    on_search: Callable[[str], None] | None = None,
    on_filter: Callable[[PrimeFilterMode], None] | None = None,
) -> QWidget:
    """Build the custom toolbar for filters."""
    widget = QWidget()
    layout = QHBoxLayout(widget)
    layout.setContentsMargins(8, 8, 8, 8)
    layout.setSpacing(8)

    search = QLineEdit()
    search.setPlaceholderText("Search...")

    def _on_text() -> None:
        if on_search:
            on_search(search.text())

    search.textChanged.connect(lambda _: _on_text())

    filter_btn = QPushButton("All")
    mode = PrimeFilterMode.ALL

    def _cycle() -> None:
        nonlocal mode

        if mode == PrimeFilterMode.ALL:
            mode = PrimeFilterMode.PRIMES
            filter_btn.setText("Primes")
        elif mode == PrimeFilterMode.PRIMES:
            mode = PrimeFilterMode.NORMAL
            filter_btn.setText("Normal")
        else:
            mode = PrimeFilterMode.ALL
            filter_btn.setText("All")

        if on_filter:
            on_filter(mode)

    filter_btn.clicked.connect(_cycle)

    layout.addWidget(search)
    layout.addWidget(filter_btn)

    return widget
