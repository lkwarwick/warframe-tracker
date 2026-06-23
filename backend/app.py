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

PAGE_SIZE = 48
ITEM_FILTER_CACHE: dict[tuple[str, str], list[Item]] = {}
PAGE_RENDER_CACHE: dict[tuple[str, str, int], list[html.Div]] = {}


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


def cached_page(group_key: str, prime_filter: str, page: int) -> list[html.Div]:
    cache_key = (group_key, prime_filter, page)
    if cache_key in PAGE_RENDER_CACHE:
        return PAGE_RENDER_CACHE[cache_key]

    items = cached_items(group_key, prime_filter)
    cards = render_items(paginate_items(items, page))
    PAGE_RENDER_CACHE[cache_key] = cards
    return cards


def paginate_items(items: list[Item], page: int) -> list[Item]:
    start = (page - 1) * PAGE_SIZE
    return items[start : start + PAGE_SIZE]


def page_count(items: list[Item]) -> int:
    return max(1, (len(items) + PAGE_SIZE - 1) // PAGE_SIZE)


app.layout = html.Div(
    className="app-grid",
    children=[
        html.Div("Warframe Tracker", className="header"),
        html.Div(
            [
                html.Div("Filters", className="sidebar-header"),
                dcc.RadioItems(
                    id="prime-filter",
                    options=[
                        {"label": "All", "value": "all"},
                        {"label": "Prime Only", "value": "prime"},
                        {"label": "Non-Prime Only", "value": "nonprime"},
                    ],
                    value="all",
                    labelStyle={"display": "block"},
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
                dcc.Store(id="page-store", data=1),
                html.Div(
                    [
                        html.Div(
                            render_items(paginate_items(cached_items("warframes", "all"), 1)),
                            id="card-grid",
                            className="card-grid",
                        ),
                        html.Div(
                            [
                                html.Button("Prev", id="prev-page", className="toolbar-button", n_clicks=0),
                                html.Button("Next", id="next-page", className="toolbar-button", n_clicks=0),
                                html.Div("Page 1", id="page-text", className="page-text"),
                            ],
                            className="pager",
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
    Output("page-store", "data"),
    Output("prev-page", "disabled"),
    Output("next-page", "disabled"),
    Output("page-text", "children"),
    Output("status-text", "children"),
    Input({"type": "group-btn", "index": ALL}, "n_clicks"),
    Input("search-input", "value"),
    Input("prime-filter", "value"),
    Input("prev-page", "n_clicks"),
    Input("next-page", "n_clicks"),
    State("active-list", "data"),
    State("page-store", "data"),
)
def update_item_list(button_clicks, search_value, prime_filter_value, prev_clicks, next_clicks, active_list, current_page):
    active_key = active_list or "warframes"
    triggered = callback_context.triggered[0]["prop_id"] if callback_context.triggered else ""
    group_changed = False
    page = current_page or 1

    if triggered and triggered != ".":
        try:
            trigger_id = json.loads(triggered.split(".")[0])
            if trigger_id.get("type") == "group-btn":
                if trigger_id["index"] != active_key:
                    active_key = trigger_id["index"]
                    group_changed = True
            elif trigger_id.get("type") == "prev-page":
                page = max(1, page - 1)
            elif trigger_id.get("type") == "next-page":
                page += 1
        except ValueError:
            if triggered.startswith("search-input") or triggered.startswith("prime-filter"):
                page = 1
            elif triggered.startswith("prev-page"):
                page = max(1, page - 1)
            elif triggered.startswith("next-page"):
                page += 1

    if triggered and triggered != "." and not group_changed and not triggered.startswith("prev-page") and not triggered.startswith("next-page"):
        if triggered.startswith("search-input") or triggered.startswith("prime-filter"):
            page = 1

    effective_query = None if group_changed else (search_value or None)

    if effective_query is None:
        filtered_items = cached_items(active_key, prime_filter_value)
    else:
        filtered_items = filter_items(get_items(active_key), effective_query, prime_filter_value)

    total_pages = page_count(filtered_items)
    page = min(max(1, page), total_pages)
    if effective_query is None:
        cards = cached_page(active_key, prime_filter_value, page)
    else:
        cards = render_items(paginate_items(filtered_items, page))

    prev_disabled = page <= 1
    next_disabled = page >= total_pages

    button_classes = [
        "toolbar-button active" if group_id == active_key else "toolbar-button"
        for group_id in ITEM_GROUPS
    ]
    display_query = effective_query or ""
    status_text = f"{ITEM_GROUPS[active_key]['label']} — Filter: {prime_filter_value} — Query: {display_query}"
    page_text = f"Page {page} / {total_pages}"

    return cards, active_key, button_classes, ("" if group_changed else (search_value or "")), page, prev_disabled, next_disabled, page_text, status_text


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