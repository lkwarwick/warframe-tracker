from dash import Dash, html, dcc
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
    return [Item.model_validate(x) for x in raw if x.get("uniqueName") != "/Lotus/Powersuits/PowersuitAbilities/Helminth"]



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
                        className="component-pill",
                        children=str(c.name if hasattr(c, "name") else c),
                    )
                    for c in components
                ],
            ),
        ],
    )

items = load_warframes()

app.layout = html.Div(
    className="app-grid",
    children=[
        html.Div("Warframe Tracker", className="header"),
        html.Div("Left Sidebar", className="left"),
        html.Div(
            [
                dcc.Input(placeholder="Search...", className="search"),
                html.Div(
                    [vertical_card(i) for i in items],
                    className="card-grid",
                ),
            ],
            className="content",
        ),
        html.Div("Right Sidebar", className="right"),
    ],
)

@server.route("/shutdown", methods=["POST"])
def shutdown():
    os.kill(os.getpid(), signal.SIGTERM)
    return "ok"

if __name__ == "__main__":
    app.run(debug=True, port=8050)