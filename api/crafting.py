from typing import List, Dict, Optional
from api.schemas.warframes import Warframe
from api.schemas.recipes import Blueprint, Ingredient
from api.schemas.resources import ResourceItem

def get_immediate_resources(warframe_unique_name: str, recipes: List[Blueprint], resources: List[ResourceItem]) -> List[Dict]:
    """
    Returns the immediate resources needed for crafting a given warframe.
    
    Args:
        warframe_unique_name: The unique name of the warframe to find ingredients for.
        recipes: A list of Blueprint objects.
        resources: A list of ResourceItem objects.
        
    Returns:
        A list of dictionaries, each containing 'name', 'unique_name', and 'count' for an ingredient.
    """
    # Find the blueprint where the result_type matches the warframe'    # unique_name
    blueprint = next((r for r in recipes if r.result_type == warframe_unique_name), None)
    
    if not blueprint:
        return []

    results = []
    for ing in blueprint.ingredients:
        # Find the resource name corresponding to the ingredient's item_type
        res_name = "Unknown"
        for res in resources:
            if res.unique_name == ing.item_type:
                res_name = res.name
                break
        
        results.append({
            "name": res_name,
            "unique_name": ing.item_type,
            "count": ing.item_count
        })
    
    return results
