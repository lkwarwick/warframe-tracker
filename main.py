from PySide6.QtWidgets import (
    QApplication,
    QWidget,
    QVBoxLayout,
    QScrollArea,
    QGridLayout,
)
from PySide6.QtCore import Qt

from domain.loader import load_warframes
from domain.images import get_warframe_images
from state.store import Store
from ui.item_cell import ItemCell


class App(QWidget):
    def __init__(self, items, store, images):
        super().__init__()

        self.items = items
        self.store = store
        self.images = images

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

        for wf in self.items:
            cell = ItemCell(wf, self.store, self.images.get(wf.unique_name))
            self.cells.append(cell)

        self.relayout()

    def relayout(self):
        width = self.container.width() or 800
        cell_w = 160
        cols = max(1, width // cell_w)

        for i, cell in enumerate(self.cells):
            self.grid.addWidget(cell, i // cols, i % cols)

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.relayout()


if __name__ == "__main__":
    app = QApplication([])

    items = load_warframes()
    store = Store()
    images = get_warframe_images()

    w = App(items, store, images)
    w.show()

    app.exec()