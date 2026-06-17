from PySide6.QtWidgets import QWidget, QVBoxLayout, QScrollArea, QGridLayout
from PySide6.QtCore import Qt, QTimer

from ui.item_cell import ItemCell
from ui.toolbar import build_toolbar


class WarframesPage(QWidget):
    def __init__(self, items, store, loader):
        super().__init__()

        self.items = items
        self.filtered_items = list(self.items)
        self.store = store
        self.loader = loader

        self.container = QWidget()
        self.grid = QGridLayout(self.container)

        self.grid.setSpacing(12)
        self.grid.setContentsMargins(12, 12, 12, 12)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.scroll.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
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

    def render(self):
        while self.grid.count():
            w = self.grid.takeAt(0).widget()
            if w:
                w.deleteLater()

        self.cells.clear()

        for i, wf in enumerate(self.filtered_items):
            cell = ItemCell(wf, self.store, self.loader)
            self.cells.append(cell)
            self.grid.addWidget(cell, i // self.cols(), i % self.cols())

    def cols(self):
        width = self.scroll.viewport().size().width()
        cell_width = 220
        return max(1, width // (cell_width + 12))

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.relayout()

    def relayout(self):
        cols = self.cols()
        for i, cell in enumerate(self.cells):
            self.grid.addWidget(cell, i // cols, i % cols)

    def on_search(self, text: str):
        t = text.lower().strip()

        if not t:
            self.filtered_items = self.items
        else:
            self.filtered_items = [
                wf for wf in self.items
                if t in wf.name.lower()
            ]

        self.render()

    def on_filter(self):
        pass