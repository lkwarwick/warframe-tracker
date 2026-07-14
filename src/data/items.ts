import type { Item, PrimePart } from "./types.ts";

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

export const warframes: Item[] = (warframesJson as Item[]).filter((w) => w.masterable && notBlacklisted(w));

export const primaries: Item[] = (primaryJson as Item[]).filter((i) => i.masterable && notBlacklisted(i));

export const secondaries: Item[] = (secondaryJson as Item[]).filter((i) => i.masterable && notBlacklisted(i));

export const melee: Item[] = (meleeJson as Item[]).filter((i) => i.masterable && notBlacklisted(i));

export const archwing: Item[] = [
  ...(archwingJson as Item[]),
  ...(archGunJson as Item[]),
  ...(archMeleeJson as Item[]),
].filter((i) => i.masterable && notBlacklisted(i));

export const companions: Item[] = [
  ...(petsJson as Item[]),
  ...(sentinelsJson as Item[]),
  ...(sentinelWeaponsJson as Item[]),
].filter((i) => i.masterable && notBlacklisted(i));

export const all: Item[] = [
  ...warframes,
  ...primaries,
  ...secondaries,
  ...melee,
  ...archwing,
  ...companions,
];

/* ---------------------------------- Parts --------------------------------- */

export function getAllPrimeParts(): PrimePart[] {
  return all.flatMap(item =>
    (item.components ?? [])
      .filter(c => typeof c.ducats === "number" && c.ducats > 0)
      .map(c => ({
          ...item,
          ...c,
          parentName: item.name,
          componentName: c.name,
          parentUniqueName: item.uniqueName,
          componentUniqueName: c.uniqueName,
      }))
  );
}