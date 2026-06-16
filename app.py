import json
import requests
from pathlib import Path
from dash import Dash, html, dcc
from api.schemas.warframes import Warframe

WFCD_BASE = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/"
IMG_BASE = "https://cdn.warframestat.us/img/"

def get_warframe_images() -> dict:
    """Fetch image mapping {uniqueName: imageUrl} from WFCD for Warframes."""
    try:
        url = f"{WFCD_BASE}Warframes.json"
        response = requests.get(url)
        response.raise_for_status()
        items = response.json()
        return {
            item["uniqueName"]: IMG_BASE + item["imageName"]
            for item in items
            if item.get("imageName")
        }
    except Exception as e:
        print(f"Error fetching warframe images: {e}")
        return {}

def load_data():
    data_dir = Path("data")
    
    try:
        # Load Warframes
        with open(data_dir / "WFCD_Warframes.json", "r") as f:
            warframes = [Warframe.model_validate(wf) for wf in json.load(f)]
            # Filter out <ARCHWING> and sort alphabetically
            warframes = sorted([wf for wf in warframes if not wf.name.startswith("<ARCHWING>")], key=lambda x: x.name)
        
        return warframes, None
    except Exception as e:
        return [], str(e)

def create_warframe_cell(warframe: Warframe, image_map: dict):
    ingredients = warframe.get_ingredients()
    
    children = []
    
    # Add checkbox
    children.append(
        dcc.Checklist(
            options=[{'label': '', 'value': True}],
            value=[],
            id={'type': 'wf-checkbox', 'index': warframe.unique_name},
            className='warframe-checkbox'
        )
    )
    
    # Add image if available
    image_url = image_map.get(warframe.unique_name)
    if image_url:
        children.append(html.Img(src=image_url, style={'width': '100%', 'height': 'auto', 'border-radius': '5px', 'margin-bottom': '10px'}))

    children.append(html.Div(children=warframe.name, className='warframe-name'))
    
    if ingredients:
        ingredient_items = [
            html.Div(children=f"{ing['count']}x {ing['name']}", className='ingredient-item')
            for ing in ingredients
        ]
        children.append(html.Div(children=ingredient_items, className='ingredient-list'))
        
    return html.Div(children=children, className='warframe-card')

# Load data and images
warframes, error_msg = load_data()
warframe_images = get_warframe_images()

app = Dash(__name__)

app.layout = html.Div(children=[
    html.Div(children=[
        html.H1(children='Warframe Tracker'),
        html.Div(children=[create_warframe_cell(wf, warframe_images) for wf in warframes], className='warframe-grid') if not error_msg else html.P(children=f"Error loading data: {error_msg}"),
    ], className='container')
])

if __name__ == '__main__':
    app.run(debug=True)
