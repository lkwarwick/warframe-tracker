import json
from flask import jsonify, request
from pathlib import Path
from dash import Dash, html, dcc, callback_context
from dash.dependencies import ALL, Input, Output, State
import os
from loguru import logger
from schemas.item import Item
import signal
import requests

app = Dash(__name__)
app.title = "Warframe Tracker"
server = app.server

IMG_BASE = "https://cdn.warframestat.us/img/"
WF_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json"
PRIMARY_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/refs/heads/master/data/json/Primary.json"


def load_warframes() -> list[Item]:
    """Load Warframes from the remote source."""
    logger.info("Loading warframes from remote source...")
    raw = requests.get(WF_URL, timeout=10).json()
    logger.info(f"Loaded {len(raw)} warframes from remote source.")
    return [
        Item.model_validate(x)
        for x in raw
        if x.get("uniqueName") != "/Lotus/Powersuits/PowersuitAbilities/Helminth"
    ]


def load_primary_weapons() -> list[Item]:
    """Load primary weapons from the remote source."""
    logger.info("Loading primary weapons from remote source...")
    raw = requests.get(PRIMARY_URL, timeout=10).json()
    logger.info(f"Loaded {len(raw)} primary weapons from remote source.")
    return [Item.model_validate(x) for x in raw]


def filter_items(items: list[Item], query: str | None) -> list[Item]:
    if not query:
        return items
    q = query.lower().strip()
    return [item for item in items if q in item.name.lower()]


def vertical_card(item):
    components = (item.components or [])[:5]
    return html.Div(
        className="card",
        children=[
            html.Img(src=f"{IMG_BASE}{item.image_name}", className="card-image"),
            html.H3(item.name, className="card-title"),
            html.Div(
                className="card-checklist",
                children=[
                    html.Div(
                        str(c.name if hasattr(c, "name") else c),
                        className="component-pill",
                        **{"data-wf": item.unique_name, "data-idx": str(idx)},
                    )
                    for idx, c in enumerate(components)
                ],
            ),
        ],
    )


ITEM_GROUPS = {
    "warframes": {
        "label": "Warframes",
        "loader": load_warframes,
        "items": None,
    },
    "primary_weapons": {
        "label": "Primary Weapons",
        "loader": load_primary_weapons,
        "items": None,
    },
}


def get_items(group_key: str) -> list[Item]:
    group = ITEM_GROUPS[group_key]
    if group["items"] is None:
        group["items"] = group["loader"]()
    return group["items"]


app.layout = html.Div(
    className="app-grid",
    children=[
        html.Div("Warframe Tracker", className="header"),
        html.Div("Left Sidebar", className="left"),
        html.Div(
            [
                html.Div(
                    [
                        html.Button(
                            group["label"],
                            id={"type": "group-btn", "index": group_id},
                            className=("toolbar-button active" if group_id == "warframes" else "toolbar-button"),
                            n_clicks=0,
                        )
                        for group_id, group in ITEM_GROUPS.items()
                    ],
                    className="toolbar",
                ),
                dcc.Input(id="search-input", placeholder="Search...", className="search", debounce=True),
                dcc.Store(id="active-list", data="warframes"),
                html.Div(
                    [vertical_card(i) for i in get_items("warframes")],
                    id="card-grid",
                    className="card-grid",
                ),
            ],
            className="content",
        ),
        html.Div("Right Sidebar", className="right"),
    ],
)


@app.callback(
    Output("card-grid", "children"),
    Output("active-list", "data"),
    Output({"type": "group-btn", "index": ALL}, "className"),
    Output("search-input", "value"),
    Input({"type": "group-btn", "index": ALL}, "n_clicks"),
    Input("search-input", "value"),
    State("active-list", "data"),
)
def update_item_list(button_clicks, search_value, active_list):
    active_key = active_list or "warframes"
    triggered = callback_context.triggered[0]["prop_id"] if callback_context.triggered else ""
    group_changed = False

    if triggered and triggered != ".":
        try:
            trigger_id = json.loads(triggered.split(".")[0])
            if trigger_id.get("type") == "group-btn":
                if trigger_id["index"] != active_key:
                    active_key = trigger_id["index"]
                    group_changed = True
        except ValueError:
            pass

    # If group changed, clear the search filter
    effective_query = None if group_changed else search_value

    items = filter_items(get_items(active_key), effective_query)
    button_classes = [
        "toolbar-button active" if group_id == active_key else "toolbar-button"
        for group_id in ITEM_GROUPS
    ]

    return [vertical_card(i) for i in items], active_key, button_classes, ("" if group_changed else (search_value or ""))


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
    app.run(debug=True, port=8050)