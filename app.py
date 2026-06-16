import json
from pathlib import Path
from dash import Dash, html
from api.schemas.warframes import Warframe
from api.schemas.recipes import Blueprint
from api.schemas.resources import ResourceItem
from api.crafting import get_immediate_resources

def load_data():
    data_dir = Path("data")
    
    try:
        # Load Warframes
        with open(data_dir / "warframes.json", "r") as f:
            warframes = [Warframe(**wf) for wf in json.load(f)]
            # Filter out <ARCHWING> and sort alphabetically
            warframes = sorted([wf for wf in warframes if not wf.name.startswith("<ARCHWING>")], key=lambda x: x.name)

        # Load Recipes
        with open(data_dir / "recipes.json", "r") as f:
            recipes = [Blueprint(**r) for r in json.load(f)]

        # Load Resources
        with open(data_dir / "resources.json", "r") as f:
            resources = [ResourceItem(**r) for r in json.load(f)]
        
        return warframes, recipes, resources, None
    except Exception as e:
        return [], [], [], str(e)

def create_warframe_cell(warframe: Warframe, recipes: List[Blueprint], resources: List[ResourceItem]):
    ingredients = get_immediate_resources(warframe.unique_name, recipes, resources)
    
    children = [html.Div(children=warframe.name, className='warframe-name')]
    
    if ingredients:
        ingredient_items = [
            html.Div(children=f"{ing['count']}x {ing['name']}", className='ingredient-item')
            for ing in ingredients
        ]
        children.append(html.Div(children=ingredient_items, className='ingredient-list'))
        
    return html.Div(children=children, className='warframe-card')

# Load data
warframes, recipes, resources, error_msg = load_data()

app = Dash(__name__)

app.layout = html.Div(children=[
    html.Div(children=[
        html.H1(children='Warframe Tracker'),
        html.Div(children=[create_warframe_cell(wf, recipes, resources) for wf in warframes], className='warframe-grid') if not error_msg else html.P(children=f"Error loading data: {error_msg}"),
    ], className='container')
])

if __name__ == '__main__':
    app.run(debug=True)
