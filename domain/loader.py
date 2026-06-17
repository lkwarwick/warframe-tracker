import json
from pathlib import Path
from domain.models import Warframe


DATA_PATH = Path("./data/WFCD_Warframes.json")


def load_warframes() -> list[Warframe]:
    raw = json.loads(DATA_PATH.read_text())
    return [Warframe.model_validate(x) for x in raw]