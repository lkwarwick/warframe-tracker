import json
from pathlib import Path


STATE_PATH = Path("data/state.json")


class Store:
    def __init__(self):
        self.selected = set()
        self.component_selected: dict[str, set[str]] = {}
        self.load()

    def load(self):
        if not STATE_PATH.exists():
            return

        data = json.loads(STATE_PATH.read_text())

        self.selected = set(data.get("selected", []))

        self.component_selected = {
            k: set(v)
            for k, v in data.get("component_selected", {}).items()
        }

    def save(self):
        STATE_PATH.parent.mkdir(exist_ok=True)

        STATE_PATH.write_text(
            json.
            dumps(
                {
                    "selected": list(self.selected),
                    "component_selected": {
                        k: list(v) for k, v in self.component_selected.items()
                    },
                },
                indent=2,
            )
        )

    def toggle(self, uid: str, value: bool):
        if value:
            self.selected.add(uid)
        else:
            self.selected.discard(uid)

        self.save()
    
    def toggle_component(self, wf_uid: str, comp_uid: str, state: bool):
        if wf_uid not in self.component_selected:
            self.component_selected[wf_uid] = set()

        if state:
            self.component_selected[wf_uid].add(comp_uid)
        else:
            self.component_selected[wf_uid].discard(comp_uid)

        self.save()

    def is_wf_complete(self, wf) -> bool:
        if not wf.components:
            return wf.unique_name in self.selected

        comp = self.component_selected.get(wf.unique_name, set())

        return all(
            c.unique_name in comp
            for c in wf.components
            if c.unique_name
        )