"""Contains the Warframe display page."""
from typing import TYPE_CHECKING

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import QGridLayout, QScrollArea, QVBoxLayout, QWidget

from ui.item_cell import ItemCell
from ui.toolbar import build_toolbar

if TYPE_CHECKING:
    from PySide6.QtGui import QResizeEvent

    from domain.models import Warframe
    from infra.image_loader import ImageLoader
    from state.store import Store


class WarframesPage(QWidget):
    """Contains the layout for the Warframes page."""

    def __init__(self, items: list[Warframe], store: Store, loader: ImageLoader) -> None:
        super().__init__()

        self.items = items
        self.filtered_items = list(self.items)
        self.store = store
        self.loader = loader

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
            on_filter=self.on_filter,
        )

        layout = QVBoxLayout(self)
        layout.addWidget(toolbar)
        layout.addWidget(self.scroll)

        self.cells = []
        self.render()
        QTimer.singleShot(0, self.relayout)

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
        self.relayout()

    def relayout(self) -> None:
        """Force a relayout calculation."""
        cols = self.cols()
        for i, cell in enumerate(self.cells):
            self.grid.addWidget(cell, i // cols, i % cols)

    def on_search(self, text: str) -> None:
        """Ran when the user inputs text in the search bar."""
        t = text.lower().strip()

        if not t:
            self.filtered_items = self.items
        else:
            self.filtered_items = [
                wf for wf in self.items
                if t in wf.name.lower()
            ]

        self.render()

    def on_filter(self) -> None:
        """Ran when filter is selected."""
