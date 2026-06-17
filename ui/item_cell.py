from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtGui import QPixmap
from PySide6.QtCore import Qt
import requests


class ItemCell(QWidget):
    def __init__(self, wf, store, image_url: str | None):
        super().__init__()

        self.wf = wf
        self.store = store

        self.setFixedSize(140, 180)

        layout = QVBoxLayout(self)

        self.image = QLabel()
        self.image.setAlignment(Qt.AlignCenter)

        if image_url:
            try:
                r = requests.get(image_url, timeout=5)
                pix = QPixmap()
                pix.loadFromData(r.content)
                self.image.setPixmap(
                    pix.scaled(96, 96, Qt.KeepAspectRatio, Qt.SmoothTransformation)
                )
            except:
                pass

        self.label = QLabel(wf.name)
        self.label.setAlignment(Qt.AlignCenter)

        layout.addWidget(self.image)
        layout.addWidget(self.label)

        self.update_style()

    def mousePressEvent(self, event):
        new_state = self.wf.unique_name not in self.store.selected
        self.store.toggle(self.wf.unique_name, new_state)
        self.update_style()

    def update_style(self):
        if self.wf.unique_name in self.store.selected:
            self.setStyleSheet("background-color: #2a6; border-radius: 8px;")
        else:
            self.setStyleSheet("background-color: #333; border-radius: 8px;")