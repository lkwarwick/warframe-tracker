import json
from pathlib import Path
from dash import Dash, html
from api.schemas.warframes import Warframe

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

def create_warframe_cell(warframe: Warframe):
    ingredients = warframe.get_ingredients()
    
    children = [html.Div(children=warframe.name, className='warframe-name')]
    
    if ingredients:
        ingredient_items = [
            html.Div(children=f"{ing['count']}x {ing['name']}", className='ingredient-item')
            for ing in ingredients
        ]
        children.append(html.Div(children=ingredient_items, className='ingredient-list'))
        
    return html.Div(children=children, className='warframe-card')

# Load data
warframes, error_msg = load_data()

app = Dash(__name__)

app.layout = html.Div(children=[
    html.Div(children=[
        html.H1(children='Warframe Tracker'),
        html.Div(children=[create_warframe_cell(wf) for wf in warframes], className='warframe-grid') if not error_msg else html.P(children=f"Error loading data: {error_msg}"),
    ], className='container')
])

if __name__ == '__main__':
    app.run(debug=True)
