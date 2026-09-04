import { all, archwing, companions, melee, primaries, secondaries, warframes } from "../data/items"
import type { Item } from "../data/types"
import "./Foundry.css"
import { Circle, Crosshair, Funnel, Package, PawPrint, Rocket, SquaresFour, Sword, User } from "phosphor-react";
import { useComponentCounts } from "../hooks/useComponentCounts";
import { EMPTY_MASTERED, type FoundrySettings, useUserStore } from "../persistence/userStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ItemGroup, PrimeFilter, PrimePartEntry } from "../types/view";
import ItemModal from "../components/ItemModal";
import FoundryItemCard from "../components/FoundryItemCard";
import PrimePartsModal from "../components/PrimePartsModal";

// Must match .grid-item's width constraints in Foundry.css
const CARD_MIN_WIDTH = 360;  // shrink floor — used only if a comfortable column can't fit at all
const CARD_MAX_WIDTH = 380;  // three-column breakpoint; cards still grow to the CSS max width
const MAX_COLUMNS = 4;
const GRID_GAP = 12;
const ESTIMATED_ROW_HEIGHT = 340; // corrected automatically per-row by the virtualizer

const DEFAULT_FOUNDRY_SETTINGS: FoundrySettings = {
    itemSearchText: "",
    hideCompleted: false,
    primeFilter: "all",
    itemGroup: "warframes",
};

const GROUPS: { key: ItemGroup; label: string; icon: any }[] = [
    { key: "all", label: "All", icon: SquaresFour },
    { key: "warframes", label: "Warframes", icon: User },
    { key: "primaries", label: "Primaries", icon: Crosshair },
    { key: "secondaries", label: "Secondaries", icon: Circle },
    { key: "melee", label: "Melee", icon: Sword },
    { key: "archwing", label: "Archwing", icon: Rocket },
    { key: "companions", label: "Companions", icon: PawPrint },
];

// ---------- useColumnCount ----------
// Mirrors `grid-template-columns: repeat(auto-fill, minmax(CARD_MIN_WIDTH, 1fr))`
// so we can chunk the flat item list into rows ourselves for virtualization.

function useColumnCount(containerRef: React.RefObject<HTMLElement | null>) {
    const [columns, setColumns] = useState(1);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const compute = () => {
            const style = getComputedStyle(el);
            const paddingLeft = parseFloat(style.paddingLeft) || 0;
            const paddingRight = parseFloat(style.paddingRight) || 0;
            const availableWidth = el.clientWidth - paddingLeft - paddingRight;

            // Prefer as many columns as fit at their comfortable MAX width —
            // this avoids squeezing in an extra narrow column just because
            // it technically satisfies the min width. Leftover space becomes
            // centered margin (handled in the row's flexbox layout) instead.
            let cols = Math.min(MAX_COLUMNS, Math.floor((availableWidth + GRID_GAP) / (CARD_MAX_WIDTH + GRID_GAP)));

            if (cols < 1) {
                // Window too narrow for even one comfortable card — allow shrinking.
                cols = Math.max(1, Math.floor((availableWidth + GRID_GAP) / (CARD_MIN_WIDTH + GRID_GAP)));
            }

            setColumns(cols);
        };

        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(el);
        return () => ro.disconnect();
    }, [containerRef]);

    return columns;
}

// ---------- Foundry ----------

export default function Foundry() {
    const { counts, increment, decrement, setValue } = useComponentCounts();
    const mastered = useUserStore((s) => s.data?.mastered || EMPTY_MASTERED);
    const userData = useUserStore((s) => s.data);
    const update = useUserStore((s) => s.update);

    const [itemSearchText, setItemSearchText] = useState(DEFAULT_FOUNDRY_SETTINGS.itemSearchText);
    const [showFilters, setShowFilters] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(DEFAULT_FOUNDRY_SETTINGS.hideCompleted);
    const [primeFilter, setPrimeFilter] = useState<PrimeFilter>(DEFAULT_FOUNDRY_SETTINGS.primeFilter);
    const [itemGroup, setItemGroup] = useState<ItemGroup>(DEFAULT_FOUNDRY_SETTINGS.itemGroup);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [showPrimeParts, setShowPrimeParts] = useState(false);
    const filtersRef = useRef<HTMLDivElement>(null);

    const itemsByGroup = useMemo(() => ({
        all: all,
        warframes: warframes,
        primaries: primaries,
        secondaries: secondaries,
        melee: melee,
        archwing: archwing,
        companions: companions,
    }), []);

    useEffect(() => {
        const saved = userData?.settings.foundry;
        if (!saved) return;

        setItemSearchText(saved.itemSearchText ?? DEFAULT_FOUNDRY_SETTINGS.itemSearchText);
        setHideCompleted(saved.hideCompleted ?? DEFAULT_FOUNDRY_SETTINGS.hideCompleted);
        setPrimeFilter(saved.primeFilter ?? DEFAULT_FOUNDRY_SETTINGS.primeFilter);
        setItemGroup(saved.itemGroup ?? DEFAULT_FOUNDRY_SETTINGS.itemGroup);
    }, [userData]);

    const updateFoundrySettings = useCallback((patch: Partial<FoundrySettings>) => {
        update((prev) => ({
            settings: {
                ...prev.settings,
                foundry: {
                    ...prev.settings.foundry,
                    ...patch,
                },
            },
        }));
    }, [update]);

    const handleSearchChange = useCallback((value: string) => {
        setItemSearchText(value);
        updateFoundrySettings({ itemSearchText: value });
    }, [updateFoundrySettings]);

    const handleHideCompletedChange = useCallback((value: boolean) => {
        setHideCompleted(value);
        updateFoundrySettings({ hideCompleted: value });
    }, [updateFoundrySettings]);

    const handlePrimeFilterChange = useCallback((value: PrimeFilter) => {
        setPrimeFilter(value);
        updateFoundrySettings({ primeFilter: value });
    }, [updateFoundrySettings]);

    const handleItemGroupChange = useCallback((value: ItemGroup) => {
        setItemGroup(value);
        updateFoundrySettings({ itemGroup: value });
    }, [updateFoundrySettings]);

    // Stable callback identities so GridItem's memo comparator actually holds
    const toggleMastered = useCallback((item: Item) => {
        update((prev) => {
            const nextMastered = { ...prev.mastered };
            if (nextMastered[item.uniqueName]) {
                delete nextMastered[item.uniqueName];
            } else {
                nextMastered[item.uniqueName] = true;
            }
            return { mastered: nextMastered };
        });
    }, [update]);

    const toggleMasteredFromModal = useCallback((e: React.MouseEvent<HTMLButtonElement>, item: Item) => {
        e.stopPropagation();
        toggleMastered(item);
    }, [toggleMastered]);

    const handleIncrement = useCallback((uniqueName: string) => increment(uniqueName), [increment]);
    const handleDecrement = useCallback((uniqueName: string) => decrement(uniqueName), [decrement]);
    const handleSetValue = useCallback((uniqueName: string, value: number) => setValue(uniqueName, value), [setValue]);

    const items = itemsByGroup[itemGroup];

    const primeParts = useMemo<PrimePartEntry[]>(() => {
        const parts = new Map<string, PrimePartEntry>();
        const unmasteredRequirements = new Map<string, number>();

        for (const item of all) {
            if (!item.isPrime || mastered[item.uniqueName]) continue;
            for (const component of item.components ?? []) {
                unmasteredRequirements.set(
                    component.uniqueName,
                    (unmasteredRequirements.get(component.uniqueName) ?? 0) + component.itemCount,
                );
            }
        }

        for (const item of all) {
            if (!item.isPrime) continue;

            for (const component of item.components ?? []) {
                const owned = counts[component.uniqueName] ?? 0;
                const isMastered = !!mastered[item.uniqueName];
                if (owned <= 0 || component.ducats === undefined) continue;

                const sellable = isMastered
                    ? owned
                    : Math.max(0, owned - (unmasteredRequirements.get(component.uniqueName) ?? 0));
                if (sellable <= 0) continue;

                const existing = parts.get(component.uniqueName);
                if (existing) {
                    existing.owned = Math.max(existing.owned, sellable);
                    existing.removeAmount = Math.max(existing.removeAmount, sellable);
                } else {
                    parts.set(component.uniqueName, {
                        uniqueName: component.uniqueName,
                        name: `${item.name} ${component.name}`,
                        imageName: component.imageName,
						ducats: component.ducats,
                        owned: sellable,
                        removeAmount: sellable,
                    });
                }
            }
        }

        return [...parts.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [counts, mastered]);

    const clearPrimeParts = useCallback(() => {
        if (primeParts.length === 0) return;

        const totalOwned = primeParts.reduce((total, part) => total + part.removeAmount, 0);
        if (!window.confirm(`Remove ${totalOwned} owned Prime part${totalOwned === 1 ? "" : "s"} from your inventory? This cannot be undone.`)) return;

        update((prev) => {
            const components = { ...prev.components };
            for (const part of primeParts) {
                const remaining = (components[part.uniqueName] ?? 0) - part.removeAmount;
                if (remaining > 0) components[part.uniqueName] = remaining;
                else delete components[part.uniqueName];
            }
            return { components };
        });
    }, [primeParts, update]);

    const filteredItems = useMemo(() => {
        return items
            .map(item => ({
                item,
                complete: mastered[item.uniqueName],
            }))
            .filter(({ item, complete }) => {
                const matchesSearch = item.name
                    .toLowerCase()
                    .includes(itemSearchText.toLowerCase());

                const matchesCompleted = !hideCompleted || !complete;

                const matchesPrime =
                    primeFilter === "all" ||
                    (primeFilter === "prime-only" && item.isPrime) ||
                    (primeFilter === "non-prime-only" && !item.isPrime);

                return matchesSearch && matchesCompleted && matchesPrime;
            })
            .sort((a, b) => a.item.name.localeCompare(b.item.name))
            .map(x => x.item);
    }, [items, mastered, itemSearchText, hideCompleted, primeFilter]);

    const gridRef = useRef<HTMLDivElement>(null);
    const columns = useColumnCount(gridRef);

    const rows = useMemo(() => {
        const out: Item[][] = [];
        for (let i = 0; i < filteredItems.length; i += columns) {
            out.push(filteredItems.slice(i, i + columns));
        }
        return out;
    }, [filteredItems, columns]);

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => gridRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: 4,
    });

    useEffect(() => {
        gridRef.current?.scrollTo({ top: 0 });
    }, [itemGroup]);

    useEffect(() => {
        if (!showFilters) return;

        const closeOnOutsideClick = (event: PointerEvent) => {
            if (!filtersRef.current?.contains(event.target as Node)) {
                setShowFilters(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setShowFilters(false);
        };

        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [showFilters]);

    return (
        <div className="foundry-view">
            <div className="toolbar-high">
                <div className="toolbar-top">
                    <div className="toolbar-left">
                        {GROUPS.map(({ key, label, icon: Icon }) => (
                            <button key={key} className="toolbar-icon-button" type="button" aria-label={label} onClick={() => handleItemGroupChange(key)}>
                                <Icon size={18} weight="bold" />
                                <span className="tooltip">{label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="toolbar-right">
                        <button className="toolbar-icon-button" type="button" aria-label="Prime Parts" onClick={() => setShowPrimeParts(true)}>
                            <Package size={18} weight="bold" />
                            <span className="tooltip">Prime Parts</span>
                        </button>
                        <div className="filters-wrapper" ref={filtersRef}>
                            <button key="filters" className="toolbar-icon-button" type="button" aria-label="filters" onClick={() => setShowFilters(!showFilters)}>
                                <Funnel size={18} weight="bold" />
                                <span className="tooltip">Filters</span>
                            </button>
                            {showFilters && (
                                <div className="filters-dropdown" onPointerDown={(e) => e.stopPropagation()}>
                                    <h4>Prime Status</h4>
                                    <label key="prime-filter-all">
                                        <input type="radio" name="group" value="all" checked={primeFilter == "all"} onChange={() => handlePrimeFilterChange("all")} />
                                        <span><p>All</p></span>
                                    </label>
                                    <label key="prime-filter-prime">
                                        <input type="radio" name="group" value="prime-only" checked={primeFilter == "prime-only"} onChange={() => handlePrimeFilterChange("prime-only")} />
                                        <span><p>Prime Only</p></span>
                                    </label>
                                    <label key="prime-filter-non-prime">
                                        <input type="radio" name="group" value="non-prime-only" checked={primeFilter == "non-prime-only"} onChange={() => handlePrimeFilterChange("non-prime-only")} />
                                        <span><p>Non-Prime Only</p></span>
                                    </label>
                                    <h4>Visibility</h4>
                                    <label key="hide-completed-filter">
                                        <input type="checkbox" checked={hideCompleted} onChange={(event) => handleHideCompletedChange(event.target.checked)}></input>
                                        <span><p>Hide Completed</p></span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="toolbar-search">
                    <input type="search" value={itemSearchText} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search items..." />
                </div>
            </div>
            <div className="grid-container">
                <div className="grid" ref={gridRef}>
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            height: rowVirtualizer.getTotalSize(),
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map(virtualRow => {
                            const row = rows[virtualRow.index];
                            return (
                                <div
                                    key={virtualRow.key}
                                    className="foundry-grid-row"
                                    ref={rowVirtualizer.measureElement}
                                    data-index={virtualRow.index}
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        width: "100%",
                                        transform: `translateY(${virtualRow.start}px)`,
                                        display: "flex",
                                        justifyContent: "center",
                                        gap: GRID_GAP,
                                        paddingBottom: GRID_GAP,
                                    }}
                                >
                                    {row.map(item => (
                                        <FoundryItemCard
                                            key={item.uniqueName}
                                            item={item}
                                            isMastered={!!mastered[item.uniqueName]}
                                            counts={counts}
                                            onToggleMastered={toggleMastered}
                                            onIncrement={handleIncrement}
                                            onDecrement={handleDecrement}
                                            onSetValue={handleSetValue}
                                            onItemModal={setSelectedItem}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <ItemModal
                item={selectedItem}
                isMastered={!!mastered[selectedItem?.uniqueName ?? ""]}
                toggleMastered={toggleMasteredFromModal}
                isOpen={selectedItem !== null}
                onClose={() => setSelectedItem(null)}
            />
            <PrimePartsModal
                entries={primeParts}
                isOpen={showPrimeParts}
                onClear={clearPrimeParts}
                onClose={() => setShowPrimeParts(false)}
            />
        </div>
    )
}