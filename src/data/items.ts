import type { BaseItem, Buildable } from "@wfcd/items";
import type { Item, ItemComponent } from "./types.ts";

import warframesJson from "../../vendor/warframe-items/data/json/Warframes.json";
import primaryJson from "../../vendor/warframe-items/data/json/Primary.json";
import secondaryJson from "../../vendor/warframe-items/data/json/Secondary.json";
import meleeJson from "../../vendor/warframe-items/data/json/Melee.json";
import archwingJson from "../../vendor/warframe-items/data/json/Archwing.json";
import archGunJson from "../../vendor/warframe-items/data/json/Arch-Gun.json";
import archMeleeJson from "../../vendor/warframe-items/data/json/Arch-Melee.json";
import petsJson from "../../vendor/warframe-items/data/json/Pets.json";
import sentinelsJson from "../../vendor/warframe-items/data/json/Sentinels.json";
import sentinelWeaponsJson from "../../vendor/warframe-items/data/json/SentinelWeapons.json";
import componentsJson from "../../vendor/warframe-items/data/json/Components.json";
import resourcesJson from "../../vendor/warframe-items/data/json/Resources.json";
import miscJson from "../../vendor/warframe-items/data/json/Misc.json";
import gearJson from "../../vendor/warframe-items/data/json/Gear.json";

type RawItem = BaseItem & Buildable;
type CatalogItem = Omit<ItemComponent, "itemCount"> & { itemCount?: number };

const componentCatalog = new Map<string, CatalogItem>();
for (const component of [
  ...(componentsJson as CatalogItem[]),
  ...(resourcesJson as CatalogItem[]),
  ...(miscJson as CatalogItem[]),
  ...(gearJson as CatalogItem[]),
  ...(primaryJson as CatalogItem[]),
  ...(secondaryJson as CatalogItem[]),
  ...(meleeJson as CatalogItem[]),
]) {
  componentCatalog.set(component.uniqueName, component);
}

function hydrateItems(items: RawItem[]): Item[] {
  return items.map((item) => ({
    ...item,
    components: item.components?.map((reference) => {
      const resolved = componentCatalog.get(reference.uniqueName);
      const existing = reference as Partial<ItemComponent>;

      return {
        ...resolved,
        uniqueName: reference.uniqueName,
        name: resolved?.name ?? existing.name ?? reference.uniqueName.split("/").pop() ?? reference.uniqueName,
        imageName: resolved?.imageName ?? existing.imageName,
        ducats: resolved?.ducats ?? existing.ducats,
        itemCount: reference.itemCount ?? resolved?.itemCount ?? 0,
      };
    }),
  }));
}

const unique_name_blacklist: string[] = [
  "/Lotus/Powersuits/PowersuitAbilities/Helminth",
  "/Lotus/Powersuits/SiriusOrion/OrionSuit",
  "/Lotus/Powersuits/Excalibur/ExcaliburPrime",
  "/Lotus/Weapons/Tenno/Pistol/LatoPrime",
  "/Lotus/Weapons/Tenno/Melee/LongSword/SkanaPrime",
  "/Lotus/Weapons/Tenno/Grimoire/TnDoppelgangerGrimoire",
];

const notBlacklisted = (i: { uniqueName: string }) =>
  !unique_name_blacklist.includes(i.uniqueName);

/* ---------------------------------- Items --------------------------------- */

export const warframes: Item[] = hydrateItems(warframesJson as RawItem[]).filter((w) => w.masterable && notBlacklisted(w));

export const primaries: Item[] = hydrateItems(primaryJson as RawItem[]).filter((i) => i.masterable && notBlacklisted(i));

export const secondaries: Item[] = hydrateItems(secondaryJson as RawItem[]).filter((i) => i.masterable && notBlacklisted(i));

export const melee: Item[] = hydrateItems(meleeJson as RawItem[]).filter((i) => i.masterable && notBlacklisted(i));

export const archwing: Item[] = hydrateItems([
  ...(archwingJson as RawItem[]),
  ...(archGunJson as RawItem[]),
  ...(archMeleeJson as RawItem[]),
]).filter((i) => i.masterable && notBlacklisted(i));

export const companions: Item[] = hydrateItems([
  ...(petsJson as RawItem[]),
  ...(sentinelsJson as RawItem[]),
  ...(sentinelWeaponsJson as RawItem[]),
]).filter((i) => i.masterable && notBlacklisted(i));

export const all: Item[] = [
  ...warframes,
  ...primaries,
  ...secondaries,
  ...melee,
  ...archwing,
  ...companions,
];
