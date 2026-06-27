from backend.schemas import Item
from dash import html


class ItemModal:
    def render(self, item=None) -> html.Div:
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
                        html.H2("Item Info", className="item-modal-title", id="item-modal-title"),
                        html.Div(
                            self.render_body(item),
                            id="item-modal-body",
                            className="item-modal-body",
                        ),
                    ],
                ),
            ],
        )

    @staticmethod
    def render_body(item: Item):
        if item is None:
            return "No item selected."

        details = []
        if item.description:
            details.append(html.P(item.description))

        details.append(
            html.Div(
                [
                    html.P(f"Type: {item.type or 'Unknown'}"),
                    html.P(f"Category: {item.category or 'Unknown'}"),
                    html.P(f"Product Category: {item.product_category or 'Unknown'}"),
                    html.P(f"Unique Name: {item.unique_name}"),
                ],
                className="item-modal-meta",
            )
        )

        if item.components:
            details.append(
                html.Div(
                    [
                        html.H4("Components"),
                        html.Ul([html.Li(getattr(c, "name", str(c))) for c in item.components]),
                    ]
                )
            )

        if item.drops:
            details.append(
                html.Div(
                    [
                        html.H4("Drops"),
                        html.Ul(
                            [
                                html.Li(
                                    f"{drop.location} ({drop.rarity}, {drop.chance * 100:.1f}%)"
                                )
                                for drop in item.drops[:5]
                            ]
                        ),
                    ]
                )
            )

        return details
