import json
from pathlib import Path


STATE_PATH = Path("data/state.json")


class Store:
    def __init__(self):
        self.selected: set[str] = set()
        self.load()

    def load(self):
        if not STATE_PATH.exists():
            return

        data = json.loads(STATE_PATH.read_text())
        self.selected = set(data.get("selected", []))

    def save(self):
        STATE_PATH.parent.mkdir(exist_ok=True)
        STATE_PATH.write_text(
            json.dumps({"selected": list(self.selected)}, indent=2)
        )

    def toggle(self, uid: str, value: bool):
        if value:
            self.selected.add(uid)
        else:
            self.selected.discard(uid)

        self.save()