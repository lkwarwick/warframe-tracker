import json
from flask import jsonify, request
from pathlib import Path
from dash import Dash, html, dcc, callback_context
from dash.dependencies import ALL, Input, Output, State
import os
from loguru import logger
import signal

from backend.schemas.item import Item
from backend.caches import ItemCache, ItemGroup
from backend.components import ItemCard

app = Dash(__name__)
app.title = "Warframe Tracker"
server = app.server

IMG_BASE = "https://cdn.warframestat.us/img/"


def filter_items(items: list[Item], query: str | None, prime_filter: str = "all") -> list[Item]:
    # filter by name first
    if query:
        q = query.lower().strip()
        items = [item for item in items if q in item.name.lower()]

    # filter by prime status
    if prime_filter == "prime":
        items = [item for item in items if item.is_prime]
    elif prime_filter == "nonprime":
        items = [item for item in items if not item.is_prime]
    return items



ITEM_FILTER_CACHE: dict[tuple[ItemGroup, str], list[Item]] = {}
RENDER_CACHE: dict[tuple[str, str], list[html.Div]] = {}
CARD_CACHE: dict[str, html.Div] = {}

def get_card(item: Item) -> html.Div:
    if item.unique_name not in CARD_CACHE:
        CARD_CACHE[item.unique_name] = ItemCard(item).render()
    return CARD_CACHE[item.unique_name]


def render_items(items: list[Item]) -> list[html.Div]:
    return [get_card(i) for i in items]


def cached_items(item_group: ItemGroup, prime_filter: str) -> list[Item]:
    cache_key = (item_group, prime_filter)
    if cache_key in ITEM_FILTER_CACHE:
        return ITEM_FILTER_CACHE[cache_key]

    items = ItemCache.fetch(item_group)
    if prime_filter == "prime":
        items = [item for item in items if item.is_prime]
    elif prime_filter == "nonprime":
        items = [item for item in items if not item.is_prime]

    ITEM_FILTER_CACHE[cache_key] = items
    return items


def cached_rendered_items(item_group: ItemGroup, prime_filter: str) -> list[html.Div]:
    cache_key = (item_group, prime_filter)
    if cache_key in RENDER_CACHE:
        return RENDER_CACHE[cache_key]

    cards = render_items(cached_items(item_group, prime_filter))
    RENDER_CACHE[cache_key] = cards
    return cards


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
                            options=[
                                {"label": "All", "value": "all"},
                                {"label": "Prime Only", "value": "prime"},
                                {"label": "Non-Prime Only", "value": "nonprime"},
                            ],
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
                                cached_rendered_items(ItemGroup.WARFRAMES, "all"),
                                id="card-grid",
                                className="card-grid",
                            ),
                            # `className`/`style` on dcc.Loading only target the
                            # spinner's own root node (used by the .card-grid-loading
                            # .dash-spinner rules in app.css). To size the actual
                            # outer wrapper div that holds #card-grid, you need
                            # `parent_className` (and `parent_style`) instead.
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

    cards = cached_rendered_items(active_key, "all")
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