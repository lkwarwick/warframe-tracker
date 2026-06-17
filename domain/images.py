import requests

WFCD_BASE = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/"
IMG_BASE = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/img/"


def get_warframe_images() -> dict[str, str]:
    url = f"{WFCD_BASE}Warframes.json"

    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()

        items = r.json()

        return {
            i["uniqueName"]: IMG_BASE + i["imageName"]
            for i in items
            if i.get("imageName")
        }

    except Exception as e:
        print(f"image fetch failed: {e}")
        return {}