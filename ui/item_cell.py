from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtGui import QPixmap
from PySide6.QtCore import Qt
from infra.image_loader import ImageLoader

IMG_BASE = "https://cdn.warframestat.us/img/"


class ItemCell(QWidget):
    def __init__(self, wf, store, loader: ImageLoader):
        super().__init__()

        self.wf = wf
        self.store = store
        self.loader = loader

        self.setFixedSize(140, 180)

        layout = QVBoxLayout(self)

        self.image = QLabel()
        self.image.setAlignment(Qt.AlignCenter)

        self.label = QLabel(wf.name)
        self.label.setAlignment(Qt.AlignCenter)

        layout.addWidget(self.image)
        layout.addWidget(self.label)

        self._load_image()
        self.update_style()

    def _load_image(self):
        if not getattr(self.wf, "image_name", None):
            return

        url = IMG_BASE + self.wf.image_name

        self.loader.fetch(
            self.wf.unique_name,
            url,
            self._on_image_loaded,
        )

    def _on_image_loaded(self, uid: str, data: bytes):
        if uid != self.wf.unique_name:
            return

        pix = QPixmap()
        if pix.loadFromData(data):
            self.image.setPixmap(
                pix.scaled(96, 96, Qt.KeepAspectRatio, Qt.FastTransformation)
            )

    def mousePressEvent(self, event):
        new_state = self.wf.unique_name not in self.store.selected
        self.store.toggle(self.wf.unique_name, new_state)
        self.update_style()

    def update_style(self):
        if self.wf.unique_name in self.store.selected:
            self.setStyleSheet("background-color: #2a6; border-radius: 8px;")
        else:
            self.setStyleSheet("background-color: #333; border-radius: 8px;")