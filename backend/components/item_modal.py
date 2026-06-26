from dash import html


class ItemModal:
    def render(self) -> html.Div:
        return html.Div(
            id="item-modal",
            className="item-modal hidden",
            children=[
                html.Div(
                    className="item-modal-content",
                    children=[
                        html.Button(
                            "×",
                            className="item-modal-close",
                            title="Close",
                            **{"type": "button"},
                        ),
                        html.H2("Item Info", className="item-modal-title"),
                        html.Div(
                            "No item selected.",
                            id="item-modal-body",
                            className="item-modal-body",
                        ),
                    ],
                ),
            ],
        )
