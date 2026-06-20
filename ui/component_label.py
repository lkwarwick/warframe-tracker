"""Contains the ComponentLabel class."""
from typing import TYPE_CHECKING

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QLabel

if TYPE_CHECKING:
    from PySide6.QtGui import QMouseEvent


class ComponentLabel(QLabel):
    """Label for an item's component."""

    clicked = Signal(str)

    def __init__(self, component_uid: str, text: str) -> None:
        super().__init__(text)
        self.setObjectName("item-cell-component")
        self.uid = component_uid
        self.setCursor(Qt.CursorShape.PointingHandCursor)

    def mousePressEvent(self, event: QMouseEvent) -> None:
        """Ran when the user clicks on the component."""
        self.clicked.emit(self.uid)
        super().mousePressEvent(event)
