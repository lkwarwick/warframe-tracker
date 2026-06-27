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
    def render_body(item):
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
                    html.P(f"Prime: {'Yes' if item.is_prime else 'No'}"),
                    html.P(f"Mastery Req: {item.mastery_req or 'N/A'}"),
                    html.P(f"BP Cost: {item.bp_cost or 'N/A'}"),
                    html.P(f"Market Cost: {item.market_cost or 'N/A'}"),
                    html.P(f"Tradable: {'Yes' if item.tradable else 'No'}"),
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
