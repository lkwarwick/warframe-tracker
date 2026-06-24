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


def load_all_items() -> list[Item]:
    """Load all items by combining known groups."""
    warframes = ITEM_GROUPS["warframes"]["items"]
    if warframes is None:
        warframes = ITEM_GROUPS["warframes"]["items"] = load_warframes()

    primaries = ITEM_GROUPS["primary_weapons"]["items"]
    if primaries is None:
        primaries = ITEM_GROUPS["primary_weapons"]["items"] = load_primary_weapons()

    combined = warframes + primaries
    # Always return a list sorted by item name for consistent display
    return sorted(combined, key=lambda it: (it.name or "").lower())


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


LAZY_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="


def vertical_card(item):
    components = (item.components or [])[:5]
    if not components:
        components = ["Set as Completed"]

    return html.Div(
        className="card",
        children=[
            html.Img(
                src=LAZY_PLACEHOLDER,
                **{"data-src": f"{IMG_BASE}{item.image_name}"},
                className="card-image lazy",
                alt=item.name,
            ),
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
    "all": {
        "label": "All",
        "loader": load_all_items,
        "items": None,
    },
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

ITEM_FILTER_CACHE: dict[tuple[str, str], list[Item]] = {}
RENDER_CACHE: dict[tuple[str, str], list[html.Div]] = {}


def get_items(group_key: str) -> list[Item]:
    group = ITEM_GROUPS[group_key]
    if group["items"] is None:
        # Load items for the group and keep them sorted by name
        loaded = group["loader"]()
        group["items"] = sorted(loaded, key=lambda it: (it.name or "").lower())
    return group["items"]


def render_items(items: list[Item]) -> list[html.Div]:
    return [vertical_card(i) for i in items]


def cached_items(group_key: str, prime_filter: str) -> list[Item]:
    cache_key = (group_key, prime_filter)
    if cache_key in ITEM_FILTER_CACHE:
        return ITEM_FILTER_CACHE[cache_key]

    items = get_items(group_key)
    if prime_filter == "prime":
        items = [item for item in items if item.is_prime]
    elif prime_filter == "nonprime":
        items = [item for item in items if not item.is_prime]

    ITEM_FILTER_CACHE[cache_key] = items
    return items


def cached_rendered_items(group_key: str, prime_filter: str) -> list[html.Div]:
    cache_key = (group_key, prime_filter)
    if cache_key in RENDER_CACHE:
        return RENDER_CACHE[cache_key]

    cards = render_items(cached_items(group_key, prime_filter))
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
                    [
                        dcc.Loading(
                            id="card-grid-loading",
                            type="default",
                            children=html.Div(
                                cached_rendered_items("warframes", "all"),
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
                        html.Div(id="status-text", className="status"),
                    ],
                    className="main-panel",
                )
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
    Output("status-text", "children"),
    Input({"type": "group-btn", "index": ALL}, "n_clicks"),
    Input("search-input", "value"),
    Input("prime-filter", "value"),
    Input("hide-completed-filter", "value"),
    State("active-list", "data"),
)
def update_item_list(button_clicks, search_value, prime_filter_value, hide_completed_value, active_list):
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
            if triggered.startswith("search-input") or triggered.startswith("prime-filter") or triggered.startswith("hide-completed-filter"):
                group_changed = False

    effective_query = None if group_changed else (search_value or None)
    hide_completed = "hide-completed" in hide_completed_value

    if effective_query is None:
        items = cached_items(active_key, prime_filter_value)
        cards = cached_rendered_items(active_key, prime_filter_value)
    else:
        items = filter_items(get_items(active_key), effective_query, prime_filter_value)
        cards = render_items(items)

    # Filter out completed items if the toggle is enabled
    if hide_completed:
        # Load completion data from disk
        try:
            if DATA_FILE.exists():
                completion_data = json.loads(DATA_FILE.read_text())
            else:
                completion_data = {}
        except Exception:
            completion_data = {}

        # Filter items: keep only those where not all components are completed
        filtered_items = []
        for item in items:
            components = (item.components or [])[:5]
            if not components:
                # Check if the main "Set as Completed" item is marked
                main_key = item.unique_name + ":0"
                if not completion_data.get(main_key, False):
                    filtered_items.append(item)
            else:
                # Check if all components are completed
                all_completed = all(
                    completion_data.get(item.unique_name + f":{idx}", False)
                    for idx in range(len(components))
                )
                if not all_completed:
                    filtered_items.append(item)

        items = filtered_items
        cards = render_items(filtered_items)

    button_classes = [
        "toolbar-button active" if group_id == active_key else "toolbar-button"
        for group_id in ITEM_GROUPS
    ]
    display_query = effective_query or ""
    status_text = f"{ITEM_GROUPS[active_key]['label']} — {len(items)} items — Filter: {prime_filter_value} — Query: {display_query}"

    return cards, active_key, button_classes, ("" if group_changed else (search_value or "")), status_text


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
    app.run(debug=False, port=8050)