import json
import lzma
import re
from genson import SchemaBuilder
import requests

compressed_url = "https://origin.warframe.com/PublicExport/index_en.txt.lzma"
raw_data = requests.get(compressed_url).content
patched_data = raw_data[:5] + b"\xff" * 8 + raw_data[13:]
manifest_text = lzma.decompress(patched_data).decode("utf-8")

base_url = "http://content.warframe.com/PublicExport/Manifest/"


def get_json(file_pattern, data_key):
    file_name = re.search(f"{file_pattern}!\\S+", manifest_text).group(0)
    raw = requests.get(f"{base_url}{file_name}").text.replace("\r\n", "")
    return json.loads(raw)[data_key]


def write_schema(name, obj):
    b = SchemaBuilder()
    b.add_object(obj)
    with open(f"./data/{name}_schema.json", "w") as f:
        json.dump(b.to_schema(), f, indent=2)


# 1. Load Core Assets + Flavour (where component items live)
warframes = get_json("ExportWarframes_en\\.json", "ExportWarframes")
weapons = get_json("ExportWeapons_en\\.json", "ExportWeapons")
recipes = get_json("ExportRecipes_en\\.json", "ExportRecipes")
resources = get_json("ExportResources_en\\.json", "ExportResources")

# 2. Save all raw info
with open("./data/warframes.json", "w") as f: f.write(json.dumps(warframes, indent=2))
with open("./data/weapons.json", "w") as f: f.write(json.dumps(weapons, indent=2))
with open("./data/recipes.json", "w") as f: f.write(json.dumps(recipes, indent=2))
with open("./data/resources.json", "w") as f: f.write(json.dumps(resources, indent=2))

# 3. Save all schemas
write_schema("warframes", warframes)
write_schema("weapons", weapons)
write_schema("recipes", recipes)
write_schema("resources", resources)