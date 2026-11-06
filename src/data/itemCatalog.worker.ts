import { all, archwing, companions, melee, primaries, secondaries, warframes } from "./items";
import type { Item } from "./types";
import type { ItemGroup } from "../types/view";

type ItemCatalog = Record<ItemGroup, Item[]>;

const catalog: ItemCatalog = {
    all,
    warframes,
    primaries,
    secondaries,
    melee,
    archwing,
    companions,
};

(self as typeof self & { postMessage(message: ItemCatalog): void }).postMessage(catalog);
