from backend.caches import ItemGroup, ItemCache
from dash import html, dcc, Output, State, Input
from dash.dash import Dash

from backend.components.prime_filter import PrimeFilter


class MasteryToolbar:
    
    @staticmethod
    def render() -> html.Div:
        return html.Div(
            children=[
                # -------------------------------- Item Groups ------------------------------- #
                html.Div(
                    children=[
                        *[
                            html.Button(item_group, id={"type": "group-btn", "index": item_group}, className=("toolbar-button active" if item_group == ItemGroup.WARFRAMES else "toolbar-button"), n_clicks=0)
                            for item_group in ItemGroup
                            if len(ItemCache.fetch(item_group)) > 0
                        ],
                    ],
                ),
                # ---------------------------------- Filters --------------------------------- #
                html.Div(
                    children=[
                        html.Button("Filters", id="filters-button", className="toolbar-button"),
                        html.Div(
                            children=[
                                html.Div(
                                    children=[
                                        html.Div("Visibility", className="filter-group-header"),
                                        dcc.Checklist(id="hide-completed-filter", options=[{"label": " Hide Completed", "value": "hide-completed"}], value=[], className="filter-checkbox"),
                                        html.Div("Prime Status", id="prime-status-header", className="filter-group-header"),
                                        dcc.RadioItems(id="prime-filter", options=[{"label": pf, "value": pf} for pf in PrimeFilter], value="all", labelStyle={"display": "block"}, className="filter-group"),
                                    ],
                                    className="filter-section",
                                ),
                            ],
                            id="filters-menu",
                            className="filters-menu",
                            style={"display": "none"},
                        ),
                    ],
                    className="filters-wrapper",
                ),
                # ------------------------------------ End ----------------------------------- #
            ],
            className="toolbar",
        )
    
    @staticmethod
    def callbacks(app: Dash) -> None:
        @app.callback(
            Output("filters-menu", "style"),
            Input("filters-button", "n_clicks"),
            State("filters-menu", "style"),
            prevent_initial_call=True,
        )
        def toggle(_, style):
            style = style or {"display": "none"}

            if style.get("display") == "none":
                style["display"] = "block"
            else:
                style["display"] = "none"

            return style