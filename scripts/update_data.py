import json
import requests
from genson import SchemaBuilder

def update_warframes():
    url = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json"
    print(f"Fetching data from {url}...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Save raw data
        with open("./data/WFCD_Warframes.json", "w") as f:
            json.dump(data, f, indent=2)
        print("Successfully saved ./data/WFCD_Warframes.json")
        
        # Generate and save schema
        builder = SchemaBuilder()
        builder.add_object(data)
        schema = builder.to_schema()
        
        with open("./data/WFCD_Warframes-Schema.json", "w") as f:
            json.dump(schema, f, indent=2)
        print("Successfully saved ./data/WFCD_Warframes-Schema.json")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    update_warframes()
