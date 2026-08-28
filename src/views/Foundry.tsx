import type { Item } from "@wfcd/items"
import { all, archwing, companions, melee, primaries, secondaries, warframes } from "../data/items"
import "./Foundry.css"
import { CheckCircle, Circle, Crosshair, FlowerLotus, Funnel, PawPrint, Rocket, SquaresFour, Sword, User, XCircle } from "phosphor-react";
import { useComponentCounts } from "../hooks/useComponentCounts";
import { EMPTY_MASTERED, useUserStore } from "../persistence/userStore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ItemGroup, PrimeFilter } from "../types/view";
import ItemModal from "../components/ItemModal";
import FoundryItemCard from "../components/FoundryItemCard";

// Must match .grid-item's width constraints in Foundry.css
const CARD_MIN_WIDTH = 475;  // shrink floor — used only if a comfortable column can't fit at all
const CARD_MAX_WIDTH = 620;  // grow cap — tune this to taste; leftover space becomes side margins
const GRID_GAP = 12;
const ESTIMATED_ROW_HEIGHT = 340; // corrected automatically per-row by the virtualizer

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

function useColumnCount(containerRef: React.RefObject<HTMLElement>) {
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
            let cols = Math.floor((availableWidth + GRID_GAP) / (CARD_MAX_WIDTH + GRID_GAP));

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
    const update = useUserStore((s) => s.update);

    const [itemSearchText, setItemSearchText] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [primeFilter, setPrimeFilter] = useState<PrimeFilter>("all");
    const [itemGroup, setItemGroup] = useState<ItemGroup>("warframes");
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
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
                            <button key={key} className="toolbar-icon-button" type="button" aria-label={label} onClick={() => setItemGroup(key)}>
                                <Icon size={18} weight="bold" />
                                <span className="tooltip">{label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="toolbar-right">
                        <div className="filters-wrapper" ref={filtersRef}>
                            <button key="filters" className="toolbar-icon-button" type="button" aria-label="filters" onClick={() => setShowFilters(!showFilters)}>
                                <Funnel size={18} weight="bold" />
                                <span className="tooltip">Filters</span>
                            </button>
                            {showFilters && (
                                <div className="filters-dropdown" onPointerDown={(e) => e.stopPropagation()}>
                                    <h4>Prime Status</h4>
                                    <label key="prime-filter-all">
                                        <input type="radio" name="group" value="all" checked={primeFilter == "all"} onChange={() => setPrimeFilter("all")} />
                                        <span><p>All</p></span>
                                    </label>
                                    <label key="prime-filter-prime">
                                        <input type="radio" name="group" value="prime-only" checked={primeFilter == "prime-only"} onChange={() => setPrimeFilter("prime-only")} />
                                        <span><p>Prime Only</p></span>
                                    </label>
                                    <label key="prime-filter-non-prime">
                                        <input type="radio" name="group" value="non-prime-only" checked={primeFilter == "non-prime-only"} onChange={() => setPrimeFilter("non-prime-only")} />
                                        <span><p>Non-Prime Only</p></span>
                                    </label>
                                    <h4>Visibility</h4>
                                    <label key="hide-completed-filter">
                                        <input type="checkbox" checked={hideCompleted} onChange={() => setHideCompleted(!hideCompleted)}></input>
                                        <span><p>Hide Completed</p></span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="toolbar-search">
                    <input type="search" onChange={(e) => setItemSearchText(e.target.value)} placeholder="Search items..." />
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
        </div>
    )
}