import json
from pathlib import Path


STATE_PATH = Path("data/state.json")


class Store:
    def __init__(self):
        self.selected: set[str] = set()
        self.component_selected: dict[str, set[str]] = {}
        self.load()

    def load(self):
        if not STATE_PATH.exists():
            return

        data = json.loads(STATE_PATH.read_text() or "{}")

        self.selected = set(data.get("selected", []))

        raw_components = data.get("component_selected", {}) or {}
        self.component_selected = {
            k: set(v or [])
            for k, v in raw_components.items()
        }

    def save(self):
        STATE_PATH.parent.mkdir(parents=True, exist_ok=True)

        STATE_PATH.write_text(
            json.dumps(
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
        comp_set = self.component_selected.setdefault(wf_uid, set())

        if state:
            comp_set.add(comp_uid)
        else:
            comp_set.discard(comp_uid)

        self.save()

    def is_complete(self, item) -> bool:

        if not getattr(item, "components", None):
            return item.unique_name in self.selected

        comp = self.component_selected.get(item.unique_name, set())

        return all(
            c.unique_name in comp
            for c in item.components
            if c.unique_name
        )