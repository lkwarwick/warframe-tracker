"""Contains the ItemCell class for displaying any Item (i.e., Warframe, Weapon)."""
from typing import TYPE_CHECKING

from loguru import logger
from PySide6.QtCore import Qt
from PySide6.QtGui import QMouseEvent, QPixmap
from PySide6.QtWidgets import QGraphicsOpacityEffect, QLabel, QVBoxLayout, QWidget

from ui import refresh_style
from ui.component_label import ComponentLabel

if TYPE_CHECKING:
    from domain.models.item import Item
    from infra.image_loader import ImageLoader
    from state.store import Store

IMG_BASE = "https://cdn.warframestat.us/img/"


class ItemCell(QWidget):
    """Renders an Item Cell for any Item."""

    def __init__(self, item: Item, store: Store, loader: ImageLoader) -> None:
        super().__init__()

        self.item = item
        self.store = store
        self.loader = loader
        self.setFixedSize(220, 360)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(6)

        self.setObjectName("item-cell")
        self.setProperty("is_prime", self.item.is_prime)

        # Image
        self.image = QLabel()
        self.image.setFixedSize(180, 180)
        self.image.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.image.setObjectName("item-cell-image")
        self.image.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        layout.addWidget(self.image, alignment=Qt.AlignmentFlag.AlignHCenter)

        # Name
        self.label = QLabel(self.item.name)
        self.label.setFixedHeight(28)
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.label.setWordWrap(True)
        self.label.setObjectName("item-cell-name")
        self.label.setProperty("is_prime", self.item.is_prime)
        layout.addWidget(self.label)

        # COMPONENTS
        self.components_box = QWidget()
        self.components_box.setFixedHeight(110)
        self.components_box.setObjectName("item-cell-components")
        self.components_box.setProperty("is_prime", self.item.is_prime)

        comp_layout = QVBoxLayout(self.components_box)
        comp_layout.setContentsMargins(6, 6, 6, 6)
        comp_layout.setSpacing(4)

        self.component_widgets: dict[str, ComponentLabel] = {}

        self._gen = 0

        if self.item.components:
            for c in self.item.components:
                if not c.unique_name:
                    continue

                lbl = ComponentLabel(c.unique_name, f"{c.item_count}x {c.name}")
                lbl.clicked.connect(lambda uid=c.unique_name: self._on_component_clicked(uid))

                comp_layout.addWidget(lbl)
                self.component_widgets[c.unique_name] = lbl

        layout.addWidget(self.components_box)

        self._load_image()
        self.update_style()
        self._refresh_component_styles()

    # ---------------- IMAGE ----------------

    def _load_image(self) -> None:
        if not getattr(self.item, "image_name", None):
            return

        self._gen += 1
        gen = self._gen

        url = IMG_BASE + self.item.image_name

        self.loader.fetch(self.item.unique_name, url, lambda uid, data, gen=gen: self._on_image_loaded(uid, data, gen))

    def _on_image_loaded(self, uid: str, data: bytes, gen: int) -> None:
        # stale async result
        if gen != self._gen:
            return

        if uid != self.item.unique_name:
            return

        pix = QPixmap()
        if not pix.loadFromData(data):
            return

        # Qt object might already be deleted -> guard BEFORE touching it
        try:
            self.image.setPixmap(pix.scaled(180, 180, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        except RuntimeError:
            # QLabel already destroyed during filter/rebuild
            return

    # ---------------- SELECTION ----------------

    def mousePressEvent(self, event: QMouseEvent) -> None:
        """Event invoked when the component is clicked."""
        if event.button() == Qt.MouseButton.RightButton:
            self._on_right_click()
            return

        if self.item.components:
            return

        new_state = self.item.unique_name not in self.store.selected
        self.store.toggle(self.item.unique_name, new_state)
        self.update_style()

    def _on_component_clicked(self, uid: str) -> None:
        wf_uid = self.item.unique_name

        selected = self.store.component_selected.get(wf_uid, set())

        if uid in selected:
            self.store.toggle_component(wf_uid, uid, False)
        else:
            self.store.toggle_component(wf_uid, uid, True)

        self.update_style()
        self._refresh_component_styles()
        self.update()

    def _on_right_click(self) -> None:
        # Not implemented yet
        logger.warning(f"Right click not implemented yet for {self.item.unique_name}.")

    # ---------------- STYLE ----------------

    def update_style(self) -> None:
        """Update the style of the title and background."""
        # Image
        effect = QGraphicsOpacityEffect(self.image)
        effect.setOpacity(0.25 if self.store.is_complete(self.item) else 1)
        self.image.setGraphicsEffect(effect)

        # Name/Label
        self.label.setProperty("is_complete", self.store.is_complete(self.item))
        refresh_style(self.label)

        # Components
        self.components_box.setProperty("is_complete", self.store.is_complete(self.item))
        refresh_style(self.components_box)

    def _refresh_component_styles(self) -> None:
        if not self.item.components:
            return

        selected = self.store.component_selected.get(self.item.unique_name, set())

        for uid, widget in self.component_widgets.items():
            widget.setProperty("is_prime", self.item.is_prime)
            widget.setProperty("is_complete", uid in selected)
            widget.setProperty("is_item_complete", self.store.is_complete(self.item))
            refresh_style(widget)

    def _alive(self) -> bool:
        return self.image is not None and self.image.parent() is not None
