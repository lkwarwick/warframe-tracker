from PySide6.QtWidgets import QLabel
from PySide6.QtCore import Qt, Signal


class ComponentLabel(QLabel):
    clicked = Signal(str)

    def __init__(self, component_uid: str, text: str):
        super().__init__(text)
        self.uid = component_uid
        self.setCursor(Qt.PointingHandCursor)

    def mousePressEvent(self, event):
        self.clicked.emit(self.uid)
        super().mousePressEvent(event)