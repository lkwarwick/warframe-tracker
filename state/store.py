import json
from pathlib import Path


STATE_PATH = Path("data/state.json")


class Store:
    def __init__(self):
        self.selected = set()
        self.component_selected = set()
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
    
    def toggle_component(self, uid: str, state: bool):
        if state:
            self.component_selected.add(uid)
        else:
            self.component_selected.discard(uid)

    def is_wf_complete(self, wf) -> bool:
        if not wf.components:
            return wf.unique_name in self.selected

        return all(
            c.unique_name in self.component_selected
            for c in wf.components
            if c.unique_name
        )