import json
from flask import jsonify, request
from pathlib import Path
from dash import Dash, html, dcc, callback_context
from dash.dependencies import ALL, Input, Output, State
import os
from loguru import logger
import signal

from backend.caches import ItemCache, ItemGroup, ItemCardCache
from backend.components import PrimeFilter

app = Dash(__name__)
app.title = "Warframe Tracker"
server = app.server


app.layout = html.Div(
    className="app-grid",
    children=[
        html.Div("Warframe Tracker", className="header"),
        html.Div(
            [
                html.Div("Filters", className="sidebar-header"),
                html.Div(
                    [
                        html.Div("Prime Status", className="filter-group-header"),
                        dcc.RadioItems(
                            id="prime-filter",
                            options=[{"label": pf, "value": pf} for pf in PrimeFilter],
                            value="all",
                            labelStyle={"display": "block"},
                            className="filter-group",
                        ),
                    ],
                    className="filter-section",
                ),
                html.Div(
                    [
                        html.Div("Visibility", className="filter-group-header"),
                        dcc.Checklist(
                            id="hide-completed-filter",
                            options=[{"label": " Hide Completed", "value": "hide-completed"}],
                            value=[],
                            className="filter-checkbox",
                        ),
                    ],
                    className="filter-section",
                ),
            ],
            className="left",
        ),
        html.Div(
            [
                html.Div(
                    [
                        html.Button(
                            item_group,
                            id={"type": "group-btn", "index": item_group},
                            className=("toolbar-button active" if item_group == ItemGroup.WARFRAMES else "toolbar-button"),
                            n_clicks=0,
                        )
                        for item_group in ItemGroup
                    ],
                    className="toolbar",
                ),
                dcc.Input(id="search-input", placeholder="Search...", className="search", debounce=True),
                dcc.Store(id="active-list", data="warframes"),
                html.Div(
                    [
                        dcc.Loading(
                            id="card-grid-loading",
                            type="default",
                            children=html.Div(
                                ItemCardCache.rendered_item_cards(ItemGroup.WARFRAMES),
                                id="card-grid",
                                className="card-grid",
                            ),
                            className="card-grid-loading",
                            parent_className="card-grid-loading-wrapper",
                        ),
                    ],
                    className="main-panel",
                )
            ],
            className="content",
        ),
        html.Div(className="right"),
    ],
)


@app.callback(
    Output("card-grid", "children"),
    Output("active-list", "data"),
    Output({"type": "group-btn", "index": ALL}, "className"),
    Output("search-input", "value"),
    Input({"type": "group-btn", "index": ALL}, "n_clicks"),
    State("active-list", "data"),
)
def update_item_list(button_clicks, active_list):
    active_key = active_list or ItemGroup.WARFRAMES
    triggered = callback_context.triggered[0]["prop_id"] if callback_context.triggered else ""

    if triggered and triggered != ".":
        try:
            trigger_id = json.loads(triggered.split(".")[0])
            if trigger_id.get("type") == "group-btn" and trigger_id["index"] != active_key:
                active_key = trigger_id["index"]
        except ValueError:
            pass
        
    cards = ItemCardCache.rendered_item_cards(active_key)
    button_classes = [
        "toolbar-button active" if item_group == active_key else "toolbar-button"
        for item_group in ItemGroup
    ]

    return cards, active_key, button_classes, ""


DATA_DIR = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "warframe-tracker"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATA_FILE = DATA_DIR / "completion_data.json"
REPO_DATA_FILE = Path(__file__).parent / "completion_data.json"

if not DATA_FILE.exists() and REPO_DATA_FILE.exists():
    logger.info(
        "Migrating completion data from repository into the user data directory: %s",
        DATA_FILE,
    )
    DATA_FILE.write_text(REPO_DATA_FILE.read_text())

@server.route("/api/completion", methods=["GET"])
def get_completion():
    if DATA_FILE.exists():
        return DATA_FILE.read_text(), 200, {"Content-Type": "application/json"}
    return jsonify({})

@server.route("/api/completion", methods=["POST"])
def save_completion():
    data = request.get_json(silent=True) or {}
    DATA_FILE.write_text(json.dumps(data, indent=2, sort_keys=True))
    return jsonify({"ok": True})


@server.route("/shutdown", methods=["POST"])
def shutdown():
    os.kill(os.getpid(), signal.SIGTERM)
    return "ok"


if __name__ == "__main__":
    # Cache warmups
    ItemCache.preload()
    
    app.run(debug=False, port=8050)