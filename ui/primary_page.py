from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtCore import Qt


class PrimaryPage(QWidget):
    def __init__(self):
        super().__init__()

        layout = QVBoxLayout(self)

        label = QLabel("Primary (empty for now)")
        label.setAlignment(Qt.AlignCenter)
        label.setStyleSheet("color: #e6d39a; font-size: 18px;")

        layout.addWidget(label)