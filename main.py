"""Contains the main application class and the entry point of the program."""
from pathlib import Path
from typing import TYPE_CHECKING

from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QApplication,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from domain.loader import load_primaries, load_warframes
from infra.image_loader import ImageLoader
from state.store import Store
from ui.primary_page import PrimaryPage
from ui.warframes_page import WarframesPage

if TYPE_CHECKING:
    from domain.models import Warframe, Weapon


class App(QWidget):
    """Main app container."""

    def __init__(self, warframes: list[Warframe], primaries: list[Weapon], store: Store) -> None:
        super().__init__()

        self.warframes = warframes
        self.primaries = primaries
        self.store = store
        self.loader = ImageLoader()

        self.resize(1280, 720)

        layout = QVBoxLayout(self)

        # TITLE
        title = QLabel("Warframe Tracker")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
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

        self.warframes_page = WarframesPage(warframes, store, self.loader)
        self.primary_page = PrimaryPage(primaries, store, self.loader)

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

    def switch(self, index: int) -> None:
        """Switch the current page to the index's page."""
        self.stack.setCurrentIndex(index)

        self.warframes_btn.setEnabled(index != 0)
        self.primary_btn.setEnabled(index != 1)


if __name__ == "__main__":
    app = QApplication([])
    app.setWindowIcon(QIcon(str(Path("assets/icon.png"))))

    warframes = load_warframes()
    primaries = load_primaries()
    store = Store()

    w = App(warframes, primaries, store)
    w.show()

    app.exec()
