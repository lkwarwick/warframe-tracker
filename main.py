from PySide6.QtWidgets import (
    QApplication,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QStackedWidget,
)
from PySide6.QtCore import Qt

from domain.loader import load_warframes
from infra.image_loader import ImageLoader
from state.store import Store

from ui.warframes_page import WarframesPage
from ui.primary_page import PrimaryPage


class App(QWidget):
    def __init__(self, items, store):
        super().__init__()

        self.items = items
        self.store = store
        self.loader = ImageLoader()

        self.resize(1920, 1080)

        layout = QVBoxLayout(self)

        # TITLE
        title = QLabel("Warframe Tracker")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("""
            font-size: 28px;
            font-weight: 700;
            color: #e6d39a;
            padding: 12px;
        """)

        # TABS
        tabs = QHBoxLayout()

        button_style = """
            QPushButton {
                background-color: #c9a44b;
                color: black;
                border: none;
                padding: 8px 16px;
                font-weight: 600;
                border-radius: 4px;
            }

            QPushButton:disabled {
                background-color: #e6d39a;
                color: black;
            }
        """

        self.stack = QStackedWidget()

        self.warframes_page = WarframesPage(items, store, self.loader)
        self.primary_page = PrimaryPage()

        self.stack.addWidget(self.warframes_page)
        self.stack.addWidget(self.primary_page)

        self.warframes_btn = QPushButton("Warframes")
        self.primary_btn = QPushButton("Primary")

        self.warframes_btn.setStyleSheet(button_style)
        self.primary_btn.setStyleSheet(button_style)

        self.warframes_btn.setEnabled(False)

        self.warframes_btn.clicked.connect(lambda: self.switch(0))
        self.primary_btn.clicked.connect(lambda: self.switch(1))

        tabs.addStretch()
        tabs.addWidget(self.warframes_btn)
        tabs.addWidget(self.primary_btn)
        tabs.addStretch()

        layout.addWidget(title)
        layout.addLayout(tabs)
        layout.addWidget(self.stack)

    def switch(self, index: int):
        self.stack.setCurrentIndex(index)

        self.warframes_btn.setEnabled(index != 0)
        self.primary_btn.setEnabled(index != 1)


if __name__ == "__main__":
    app = QApplication([])

    items = load_warframes()
    store = Store()

    w = App(items, store)
    w.show()

    app.exec()