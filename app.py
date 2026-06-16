import json
from pathlib import Path
from dash import Dash, html
from api.schemas.warframes import Warframe
from api.schemas.recipes import Blueprint
from api.schemas.resources import ResourceItem

def load_data():
    data_dir = Path("data")
    
    try:
        # Load Warframes
        with open(data_dir / "warframes.json", "r") as f:
            warframes = [Warframe(**wf) for wf in json.load(f)]

        # Load Recipes
        with open(data_dir / "recipes.json", "r") as f:
            recipes = [Blueprint(**r) for r in json.load(f)]

        # Load Resources
        with open(data_dir / "resources.json", "r") as f:
            resources = [ResourceItem(**r) for r in json.load(f)]
        
        return warframes, recipes, resources, None
    except Exception as e:
        return [], [], [], str(e)

# Load data
warframes, recipes, resources, error_msg = load_data()

app = Dash(__name__)

app.layout = html.Div(children=[
    html.Div(children=[
        html.H1(children='Warframe Tracker'),
        html.Div(children=[
            html.Div(children=wf.name, className='warframe-card') for wf in warframes
        ]) if not error_msg else html.P(children=f"Error loading data: {error_msg}"),
    ], className='container')
])

if __name__ == '__main__':
    app.run(debug=True)
