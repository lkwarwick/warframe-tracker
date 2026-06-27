import json
from flask import jsonify, request
from pathlib import Path
import time
from dash import Dash, html, dcc, callback_context, no_update
from dash.dependencies import ALL, Input, Output, State
import os
from loguru import logger
import signal

from backend.caches import ItemCache, ItemGroup, ItemCardCache
from backend.components import PrimeFilter, ItemModal

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
                        if len(ItemCache.fetch(item_group)) > 0
                    ],
                    className="toolbar",
                ),
                dcc.Input(id="search-input", placeholder="Search...", className="search", debounce=True),
                dcc.Store(id="active-list", data=ItemGroup.WARFRAMES),
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
                ),
                ItemModal().render(),
            ],
            className="content",
        ),
        html.Div(
            children=[
                html.Div("Item Group Statistics", id="item-group-stats", className="sidebar-header"),
                html.Div("Completed: N/A", id="item-group-stats-completed", className="filter-checkbox")
            ],
            className="right"),
    ],
)


@app.callback(
    Output("item-group-stats", "children"),
    Output("item-group-stats-completed", "children"),
    Input("active-list", "data"),
)
def update_item_group_stats(item_group: ItemGroup) -> tuple[list, list]:
    all_items = ItemCache.fetch(item_group)

    # Load completion store directly from disk
    if DATA_FILE.exists():
        store = json.loads(DATA_FILE.read_text())
    else:
        store = {}

    # Count items where every component pill is marked complete
    completed = 0
    for item in all_items:
        if item.components is None:
            # No components -> rendered as a single standalone pill, idx 0
            component_keys = [f"{item.unique_name}:0"]
        else:
            component_keys = [f"{item.unique_name}:{idx}" for idx in range(len(item.components))]

        if component_keys and all(store.get(key, False) for key in component_keys):
            completed += 1

    return (
        [f"'{item_group}' Statistics"],
        [f"Completed: {completed} / {len(all_items)}"]
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
        if len(ItemCache.fetch(item_group)) > 0
    ]

    return cards, active_key, button_classes, ""


@app.callback(
    Output("item-modal-body", "children"),
    Output("item-modal-title", "children"),
    Output("item-modal", "className"),
    Input({"type": "info-button", "index": ALL}, "n_clicks_timestamp"),
)
def show_item_modal(info_click_timestamps):
    triggered = callback_context.triggered[0] if callback_context.triggered else {}
    prop_id = triggered.get("prop_id", "")
    value = triggered.get("value")

    if not prop_id or prop_id == "." or not value:
        return no_update, no_update, no_update

    try:
        trigger_id = json.loads(prop_id.split(".")[0])
    except ValueError:
        return no_update, no_update, no_update

    if trigger_id.get("type") != "info-button":
        return no_update, no_update, no_update

    item = ItemCache.fetch_by_unique_name(trigger_id["index"])
    if item is None:
        return f"Item not found: {trigger_id['index']}", "Item Info", f"item-modal item-modal-open-{int(time.time() * 1000)}"

    return (
        ItemModal().render_body(item),
        item.name or "Item Info",
        f"item-modal item-modal-open-{int(time.time() * 1000)}",
    )


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