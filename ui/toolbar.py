from PySide6.QtWidgets import QWidget, QHBoxLayout, QLineEdit, QPushButton


def build_toolbar(on_search=None, on_filter=None) -> QWidget:
    widget = QWidget()
    layout = QHBoxLayout(widget)
    layout.setContentsMargins(8, 8, 8, 8)
    layout.setSpacing(8)

    search = QLineEdit()
    search.setPlaceholderText("Search...")

    def _on_text():
        if on_search:
            on_search(search.text())

    search.textChanged.connect(lambda _: _on_text())

    filter_btn = QPushButton("Filters")

    if on_filter:
        filter_btn.clicked.connect(on_filter)

    layout.addWidget(search)
    layout.addWidget(filter_btn)

    return widget