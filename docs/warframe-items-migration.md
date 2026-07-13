# Migrating off `@wfcd/items` to a git submodule + shared item service

This replaces the `@wfcd/items` npm dependency with a git submodule pointing at
the raw `warframe-items` data, plus a plain TypeScript module that any
frontend (Electron, web, mobile) can import directly — no IPC, no API layer.

## 1. Submodule setup (partial clone + sparse + shallow — actually skips `data/img`, not just history)

A plain `git submodule add` does a **full clone first** — every commit,
every historical image ever committed to `data/img`, across 10,000+ commits.
Sparse-checkout alone doesn't fix this: it only limits what gets *checked out
to disk*, not what gets *fetched* — a normal `git fetch` still downloads the
full blob content of every file in that commit before sparse-checkout ever
filters anything, and shallow (`--depth 1`) only cuts history, not the image
blobs sitting in that one remaining commit.

The actual fix is a **partial clone** (`--filter=blob:none`), which defers
downloading file contents entirely and only fetches blobs for paths you
actually check out. Combined with sparse-checkout limited to `data/json`,
`data/img` blobs are never requested at all:

```bash
mkdir -p vendor/warframe-items
cd vendor/warframe-items
git init
git remote add origin https://github.com/WFCD/warframe-items.git
git sparse-checkout init --cone
git sparse-checkout set data/json
git fetch --filter=blob:none --depth 1 origin master
git checkout master
cd ../..

git submodule add https://github.com/WFCD/warframe-items.git vendor/warframe-items
git add .gitmodules vendor/warframe-items
git commit -m "chore: add warframe-items data submodule (partial, sparse, shallow)"
```

- `--filter=blob:none` — don't download file *contents* upfront, only commit/tree metadata.
- `--depth 1` — don't download history.
- `sparse-checkout set data/json` — when `checkout` runs, only request blobs for paths under `data/json`.
- Net result: `data/img` blobs are never fetched, not just excluded from the working tree.

Requires a reasonably modern git (2.25+, ideally 2.36+) for partial clone and
cone-mode sparse-checkout to play nicely together — run `git --version` if
anything behaves oddly.

## 2. Update script (shallow-safe)

`git submodule update --remote` can complain on a shallow clone in some git
versions, so the update command explicitly re-fetches depth 1 and checks out
the new snapshot rather than assuming full history is available:

```json
// package.json
{
  "scripts": {
    "data:update": "git -C vendor/warframe-items fetch --depth 1 origin main && git -C vendor/warframe-items checkout FETCH_HEAD"
  }
}
```

```bash
npm run data:update
```

This pulls only the newest snapshot (still no history, still no images) and
leaves it as an uncommitted change in your working tree — no automatic
`add`/`commit`, so you review and commit it yourself whenever you're ready.

```bash
npm uninstall @wfcd/items
```

## 3. tsconfig

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    // ...your existing options
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

## 4. Your own types — just the three you need

```ts
// src/shared/types.ts

/** A single craftable resource/blueprint requirement, e.g. "Neurodes x4". */
export interface Component {
  uniqueName: string;
  name: string;
  itemCount: number;
}

/** Anything masterable: warframes, weapons, companions, archwing gear. */
export interface Item {
  uniqueName: string;
  name: string;
  category: string;
  masterable: boolean;
}

/** An Item that also has a build/BP requirement chain. */
export interface Buildable extends Item {
  components: Component[];
}
```

> Adjust field names/shape once you look at an actual entry in
> `data/json/Warframes.json` — this is a reasonable starting guess based on
> how `@wfcd/items` typically structures things, but match it to what you
> actually see in the file rather than trusting this blind.

## 5. Item service (shared, no Electron code)

```ts
// src/shared/itemService.ts
import type { Item, Buildable } from "./types";

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

export function getWarframes(): Buildable[] {
  return (warframesJson as Buildable[]).filter(
    (w) => w.masterable && notBlacklisted(w)
  );
}

export function getPrimaries(): Buildable[] {
  return (primaryJson as Buildable[]).filter(
    (i) => i.masterable && notBlacklisted(i)
  );
}

export function getSecondaries(): Buildable[] {
  return (secondaryJson as Buildable[]).filter(
    (i) => i.masterable && notBlacklisted(i)
  );
}

export function getMelee(): Buildable[] {
  return (meleeJson as Buildable[]).filter(
    (i) => i.masterable && notBlacklisted(i)
  );
}

export function getArchwing(): Buildable[] {
  return [
    ...(archwingJson as Buildable[]),
    ...(archGunJson as Buildable[]),
    ...(archMeleeJson as Buildable[]),
  ].filter((i) => i.masterable && notBlacklisted(i));
}

export function getCompanions(): Item[] {
  return [
    ...(petsJson as Item[]),
    ...(sentinelsJson as Item[]),
    ...(sentinelWeaponsJson as Item[]),
  ].filter((i) => i.masterable && notBlacklisted(i));
}
```

## 6. `main.ts` — strip out everything item-related

```ts
// src/main/main.ts
import { app, BrowserWindow } from "electron";
import path from "path";
import Store from "electron-store";

/* ---------------------------- App Data (unchanged) ---------------------------- */

interface AppData {
  mastered: Record<string, true>;
  components: Record<string, number>;
  windowBounds: WindowBounds;
}

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
}

const store = new Store<AppData>({
  defaults: {
    mastered: {},
    components: {},
    windowBounds: { width: 1000, height: 700 },
  },
});

/* ------------------------------ Save Data API (unchanged, still needs IPC) ----------------------------- */
// keep get-mastered, toggle-mastered, get-components, increment-component,
// decrement-component, set-component, remove-component exactly as they were —
// these genuinely need main-process disk access via electron-store.

/* ---------------------------- Browser + Preload (unchanged) --------------------------- */
// keep as-is
```

All the `get-warframes` / `get-primaries` / etc. `ipcMain.handle` calls, and
the module-level `warframesCache` etc. variables, are deleted entirely — that
logic doesn't live in `main.ts` anymore.

## 7. Renderer usage

```tsx
// src/renderer/SomeComponent.tsx
import { getWarframes, getPrimaries } from "../shared/itemService";

const warframes = getWarframes(); // Buildable[], typed, no IPC, no async
```

## Result

- `vendor/warframe-items` is a partial, shallow, sparse clone — only
  `data/json` at the latest snapshot, no commit history, and `data/img`
  blobs are never fetched at all. Should be a few MB, not hundreds of MB.
- `src/shared/` has zero Electron imports and zero dependency on `@wfcd/items`.
- Item data updates are a single manual command: `npm run data:update`.
- `main.ts` only handles things that genuinely need OS/disk access
  (`electron-store`, window state) — item catalog data is just a bundled
  asset now.
- This same `itemService.ts` + `types.ts` pair can be copied into a future
  web or React Native project unchanged.
