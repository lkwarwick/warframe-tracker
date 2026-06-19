"""Contains the Store class, which contains and handles persistent data management."""
import json
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from domain.models.item import Item

STATE_PATH = Path("data/state.json")


class Store:
    """Handles persistent data management."""

    def __init__(self) -> None:
        self.selected: set[str] = set()
        self.component_selected: dict[str, set[str]] = {}
        self.load()

    def load(self) -> None:
        """Load the state from the file system."""
        if not STATE_PATH.exists():
            return

        data = json.loads(STATE_PATH.read_text() or "{}")

        self.selected = set(data.get("selected", []))

        raw_components = data.get("component_selected", {}) or {}
        self.component_selected = {
            k: set(v or [])
            for k, v in raw_components.items()
        }

    def save(self) -> None:
        """Write the state to the file system."""
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
            ),
        )

    def toggle(self, uid: str, value: bool) -> None:
        """Add or remove a uid based on the value."""
        if value:
            self.selected.add(uid)
        else:
            self.selected.discard(uid)

        self.save()

    def toggle_component(self, wf_uid: str, comp_uid: str, state: bool) -> None:
        """Toggle a component based on the target state."""
        comp_set = self.component_selected.setdefault(wf_uid, set())

        if state:
            comp_set.add(comp_uid)
        else:
            comp_set.discard(comp_uid)

        self.save()

    def is_complete(self, item: Item) -> bool:
        """Check whether or not the item is in a 'completed' state."""
        if not getattr(item, "components", None):
            return item.unique_name in self.selected

        comp = self.component_selected.get(item.unique_name, set())

        return all(
            c.unique_name in comp
            for c in item.components
            if c.unique_name
        ) if item.components else False
