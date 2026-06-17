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

        self.setFixedSize(220, 360)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(6)

        # IMAGE (fixed area)
        self.image = QLabel()
        self.image.setFixedSize(180, 180)
        self.image.setAlignment(Qt.AlignCenter)
        self.image.setStyleSheet("background: transparent;")
        layout.addWidget(self.image)

        # NAME (fixed height)
        self.label = QLabel(self.wf.name)
        self.label.setFixedHeight(28)
        self.label.setAlignment(Qt.AlignCenter)
        self.label.setWordWrap(True)
        self.label.setStyleSheet("""
            font-size: 16px;
            font-weight: 600;
            color: white;
        """)
        layout.addWidget(self.label)

        # COMPONENTS (fixed area)
        self.components_box = QWidget()
        self.components_box.setFixedHeight(110)

        comp_layout = QVBoxLayout(self.components_box)
        comp_layout.setContentsMargins(6, 6, 6, 6)
        comp_layout.setSpacing(4)

        if self.wf.components:
            for c in self.wf.components[:5]:
                lbl = QLabel(f"{c.item_count}× {c.name}")
                lbl.setStyleSheet("font-size: 12px; color: #ddd;")
                comp_layout.addWidget(lbl)

        layout.addWidget(self.components_box)

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
                pix.scaled(
                    180,
                    180,
                    Qt.KeepAspectRatio,
                    Qt.SmoothTransformation,
                )
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