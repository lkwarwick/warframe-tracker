"""Contains the helper function to build a search bar."""
from typing import TYPE_CHECKING

from PySide6.QtWidgets import QHBoxLayout, QLineEdit, QPushButton, QWidget

if TYPE_CHECKING:
    from collections.abc import Callable


def build_toolbar(on_search: Callable[[str], None] | None = None, on_filter: Callable[[], None] | None = None) -> QWidget:
    """Build a toolbar containing the search bar and filters."""
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

    filter_btn = QPushButton("Filters")

    if on_filter:
        filter_btn.clicked.connect(on_filter)

    layout.addWidget(search)
    layout.addWidget(filter_btn)

    return widget
