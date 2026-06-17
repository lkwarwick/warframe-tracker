from PySide6.QtWidgets import QWidget, QVBoxLayout, QScrollArea, QGridLayout
from PySide6.QtCore import Qt, QTimer

from ui.item_cell import ItemCell


class PrimaryPage(QWidget):
    def __init__(self, items, store, loader):
        super().__init__()

        self.items = items
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

        layout = QVBoxLayout(self)
        layout.addWidget(self.scroll)

        self.cells = []

        self.render()

        QTimer.singleShot(0, self.relayout)

    # ---------------- RENDER ----------------

    def render(self):
        while self.grid.count():
            w = self.grid.takeAt(0).widget()
            if w:
                w.deleteLater()

        self.cells.clear()

        for i, weapon in enumerate(self.items):
            cell = ItemCell(weapon, self.store, self.loader)
            self.cells.append(cell)

            self.grid.addWidget(
                cell,
                i // self.cols(),
                i % self.cols(),
            )

    # ---------------- LAYOUT ----------------

    def cols(self):
        width = self.scroll.viewport().width() or 800
        cell_width = 220  # must match ItemCell
        return max(1, width // (cell_width + 12))

    def resizeEvent(self, event):
        super().resizeEvent(event)
        QTimer.singleShot(0, self.relayout)

    def relayout(self):
        cols = self.cols()

        for i, cell in enumerate(self.cells):
            self.grid.addWidget(
                cell,
                i // cols,
                i % cols,
            )