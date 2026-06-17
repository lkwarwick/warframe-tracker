from PySide6.QtWidgets import (
    QApplication,
    QWidget,
    QVBoxLayout,
    QScrollArea,
    QGridLayout,
)
from PySide6.QtCore import Qt
from loguru import logger

from domain.loader import load_warframes
from infra.image_loader import ImageLoader
from state.store import Store
from ui.item_cell import ItemCell


class App(QWidget):
    def __init__(self, items, store):
        super().__init__()

        self.items = items
        self.store = store
        self.loader = ImageLoader()

        self.container = QWidget()
        self.grid = QGridLayout(self.container)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setWidget(self.container)

        layout = QVBoxLayout(self)
        layout.addWidget(scroll)

        self.cells = []
        self.render()

    def render(self):
        while self.grid.count():
            w = self.grid.takeAt(0).widget()
            if w:
                w.deleteLater()

        self.cells = []

        for i, wf in enumerate(self.items):
            cell = ItemCell(wf, self.store, self.loader)
            self.cells.append(cell)
            self.grid.addWidget(cell, i // self.cols(), i % self.cols())

    def cols(self):
        width = self.container.width() or 800
        return max(1, width // 160)

    def resizeEvent(self, event):
        super().resizeEvent(event)

        for i, cell in enumerate(self.cells):
            self.grid.addWidget(cell, i // self.cols(), i % self.cols())


if __name__ == "__main__":
    app = QApplication([])

    items = load_warframes()
    store = Store()

    w = App(items, store)
    w.show()

    app.exec()