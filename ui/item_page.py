"""Contains the Warframe display page."""
from typing import TYPE_CHECKING

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import QGridLayout, QScrollArea, QVBoxLayout, QWidget

from ui.item_cell import ItemCell
from ui.toolbar import PrimeFilterMode, build_toolbar

if TYPE_CHECKING:
    from collections.abc import Sequence

    from PySide6.QtGui import QResizeEvent

    from domain.models.item import Item
    from infra.image_loader import ImageLoader
    from state.store import Store


class ItemsPage(QWidget):
    """Abstract class to display the toolbar and items."""

    def __init__(self, items: Sequence[Item], store: Store, loader: ImageLoader) -> None:
        super().__init__()

        self.items = items
        self.filtered_items = list(self.items)
        self.store = store
        self.loader = loader
        self.search_text = ""
        self.filter_mode = PrimeFilterMode.ALL

        self.container = QWidget()
        self.grid = QGridLayout(self.container)

        self.grid.setSpacing(12)
        self.grid.setContentsMargins(12, 12, 12, 12)

        self.scroll = QScrollArea()  # ty:ignore[invalid-assignment]
        self.scroll.setWidgetResizable(True)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        self.scroll.setWidget(self.container)

        toolbar = build_toolbar(
            on_search=self.on_search,
            on_prime_filter=self.on_prime_filter,
        )

        layout = QVBoxLayout(self)
        layout.addWidget(toolbar)
        layout.addWidget(self.scroll)

        self.cells = []
        self.render()
        QTimer.singleShot(0, self._initial_render)

    def render(self) -> None:  # ty:ignore[invalid-method-override]
        """Render the layout grid of items."""
        while self.grid.count():
            w = self.grid.takeAt(0).widget()  # ty:ignore[unresolved-attribute]
            if w:
                w.deleteLater()

        self.cells.clear()

        for i, wf in enumerate(self.filtered_items):
            cell = ItemCell(wf, self.store, self.loader)
            self.cells.append(cell)
            self.grid.addWidget(cell, i // self.cols(), i % self.cols())

    def cols(self) -> int:
        """Calculate how many columns should be shown."""
        width = self.scroll.viewport().size().width()  # ty:ignore[unresolved-attribute]
        cell_width = 220
        return max(1, width // (cell_width + 12))

    def resizeEvent(self, event: QResizeEvent) -> None:
        """Ran when the screen is resized."""
        super().resizeEvent(event)
        self.render()
    def _initial_render(self) -> None:
        self.render()

    def on_search(self, text: str) -> None:
        """Ran when the user inputs text in the search bar."""
        self.search_text = text
        self.apply_filters()

    def on_prime_filter(self, mode: PrimeFilterMode) -> None:
        """Ran when filter is selected."""
        self.filter_mode = mode
        self.apply_filters()

    def apply_filters(self) -> None:
        """Apply all the active filters at once."""
        t = (self.search_text or "").lower().strip()

        items = self.items
        if t:
            items = [w for w in items if t in w.name.lower()]

        if self.filter_mode == PrimeFilterMode.PRIMES:
            items = [w for w in items if w.is_prime]
        elif self.filter_mode == PrimeFilterMode.NORMAL:
            items = [w for w in items if not w.is_prime]

        self.filtered_items = items
        self.render()
