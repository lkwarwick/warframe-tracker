from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtGui import QPixmap
from PySide6.QtCore import Qt
from infra.image_loader import ImageLoader
from ui.component_label import ComponentLabel

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

        # IMAGE
        self.image = QLabel()
        self.image.setFixedSize(180, 180)
        self.image.setAlignment(Qt.AlignCenter)
        self.image.setStyleSheet("background: transparent;")
        layout.addWidget(self.image)

        # NAME
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

        # COMPONENTS
        self.components_box = QWidget()
        self.components_box.setFixedHeight(110)

        comp_layout = QVBoxLayout(self.components_box)
        comp_layout.setContentsMargins(6, 6, 6, 6)
        comp_layout.setSpacing(4)

        self.component_widgets: dict[str, ComponentLabel] = {}
        
        self._gen = 0

        if self.wf.components:
            for c in self.wf.components:
                if not c.unique_name:
                    continue

                lbl = ComponentLabel(
                    c.unique_name,
                    f"{c.item_count}× {c.name}",
                )

                lbl.setStyleSheet("font-size: 12px; color: #dddddd;")

                lbl.clicked.connect(
                    lambda uid=c.unique_name: self._on_component_clicked(uid)
                )

                comp_layout.addWidget(lbl)
                self.component_widgets[c.unique_name] = lbl

        layout.addWidget(self.components_box)

        self._load_image()
        self.update_style()
        self._refresh_component_styles()

    # ---------------- IMAGE ----------------

    def _load_image(self):
        if not getattr(self.wf, "image_name", None):
            return

        self._gen += 1
        gen = self._gen

        url = IMG_BASE + self.wf.image_name

        self.loader.fetch(
            self.wf.unique_name,
            url,
            lambda uid, data, gen=gen: self._on_image_loaded(uid, data, gen),
        )

    def _on_image_loaded(self, uid: str, data: bytes, gen: int):
        # stale async result
        if gen != self._gen:
            return

        if uid != self.wf.unique_name:
            return

        pix = QPixmap()
        if not pix.loadFromData(data):
            return

        # Qt object might already be deleted -> guard BEFORE touching it
        try:
            self.image.setPixmap(
                pix.scaled(
                    180,
                    180,
                    Qt.KeepAspectRatio,
                    Qt.SmoothTransformation,
                )
            )
        except RuntimeError:
            # QLabel already destroyed during filter/rebuild
            return

    # ---------------- SELECTION ----------------

    def mousePressEvent(self, event):
        if self.wf.components:
            return

        new_state = self.wf.unique_name not in self.store.selected
        self.store.toggle(self.wf.unique_name, new_state)
        self.update_style()

    def _on_component_clicked(self, uid: str):
        wf_uid = self.wf.unique_name

        selected = self.store.component_selected.get(wf_uid, set())

        if uid in selected:
            self.store.toggle_component(wf_uid, uid, False)
        else:
            self.store.toggle_component(wf_uid, uid, True)

        self.update_style()
        self._refresh_component_styles()
        self.update()

    # ---------------- STYLE ----------------

    def update_style(self):
        if self.store.is_complete(self.wf):
            self.setStyleSheet("background-color: #2a6; border-radius: 8px;")
        else:
            self.setStyleSheet("background-color: #333; border-radius: 8px;")

    def _refresh_component_styles(self):
        if not self.wf.components:
            return

        selected = self.store.component_selected.get(self.wf.unique_name, set())
        all_selected = all(
            c.unique_name in selected
            for c in self.wf.components
            if c.unique_name
        )

        for uid, widget in self.component_widgets.items():
            if uid in selected and all_selected:
                widget.setStyleSheet("""
                    font-size: 12px;
                    color: #000;
                    font-weight: 600;
                """)
            elif uid in selected:
                widget.setStyleSheet("""
                    font-size: 12px;
                    color: #2a6;
                    font-weight: 600;
                """)
            else:
                widget.setStyleSheet("""
                    font-size: 12px;
                    color: #888;
                """)
                
    def _alive(self) -> bool:
        return self.image is not None and self.image.parent() is not None