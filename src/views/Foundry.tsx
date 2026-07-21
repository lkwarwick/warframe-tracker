import type { BaseItem, Buildable, Component, Item } from "@wfcd/items"
import { all, archwing, companions, melee, primaries, secondaries, warframes } from "../data/items"
import "./Foundry.css"
import { CheckCircle, Circle, Crosshair, FlowerLotus, Funnel, PawPrint, Rocket, SquaresFour, Sword, User, XCircle } from "phosphor-react";
import { useComponentCounts } from "../hooks/useComponentCounts";
import { useUserStore } from "../persistence/userStore";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ItemGroup, PrimeFilter } from "./MasteryTracker";

// Must match .grid-item's width constraints in Foundry.css
const CARD_MIN_WIDTH = 475;  // shrink floor — used only if a comfortable column can't fit at all
const CARD_MAX_WIDTH = 620;  // grow cap — tune this to taste; leftover space becomes side margins
const GRID_GAP = 12;
const ESTIMATED_ROW_HEIGHT = 340; // corrected automatically per-row by the virtualizer

// Static, doesn't need to live inside the component
const IMAGE_OVERRIDES: Record<string, string> = { '/Lotus/Types/Items/MiscItems/Forma': 'Forma.png' };

function getImageUrl(item: BaseItem | Component): string {
    const override = IMAGE_OVERRIDES[item.uniqueName];
    const imageName = override ?? item.imageName;
    return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
}

const GROUPS: { key: ItemGroup; label: string; icon: any }[] = [
    { key: "all", label: "All", icon: SquaresFour },
    { key: "warframes", label: "Warframes", icon: User },
    { key: "primaries", label: "Primaries", icon: Crosshair },
    { key: "secondaries", label: "Secondaries", icon: Circle },
    { key: "melee", label: "Melee", icon: Sword },
    { key: "archwing", label: "Archwing", icon: Rocket },
    { key: "companions", label: "Companions", icon: PawPrint },
];

// ---------- ComponentRow ----------
// One row inside a card (a single component + its owned count controls).
// Memoized on its own so typing in ONE component's count box doesn't
// re-render every other component row of every other card.

interface ComponentRowProps {
    component: Component;
    owned: number;
    onIncrement: (uniqueName: string) => void;
    onDecrement: (uniqueName: string) => void;
    onSetValue: (uniqueName: string, value: number) => void;
}

const ComponentRow = memo(function ComponentRow({
    component,
    owned,
    onIncrement,
    onDecrement,
    onSetValue,
}: ComponentRowProps) {
    const haveComponent = owned >= component.itemCount;
    const HaveIcon = haveComponent ? CheckCircle : XCircle;

    return (
        <div className="item-modal-component grid-item-component">
            <img className="item-modal-component-image" src={getImageUrl(component)} style={{ width: "40px" }} />
            <h5 className="item-modal-component-text" style={{ width: "100px" }}>{component.name}</h5>
            <div className="item-modal-component-owned">
                <button onClick={() => onDecrement(component.uniqueName)}>-</button>
                <input
                    type="number"
                    value={owned}
                    min="0"
                    onChange={(e) => onSetValue(component.uniqueName, Number(e.target.value))}
                />
                <button onClick={() => onIncrement(component.uniqueName)}>+</button>
            </div>
            <p className="item-modal-component-needed" style={{ width: "30px" }}>{component.itemCount}</p>
            <HaveIcon
                style={{ width: "25px", marginRight: "12px" }}
                data-have-component={haveComponent}
                className="item-modal-component-have"
                size={26}
                weight="bold"
            />
        </div>
    );
});

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

// ---------- GridItem ----------
// One card. Memoized with a custom comparator: `counts` is one shared
// Record<string, number> for every component in the game, so a naive
// reference-equality check on `counts` would bust the memo for every
// card whenever ANY component's count changed anywhere. Instead we
// only compare the counts that are actually relevant to this item's
// own components.

interface GridItemProps {
    item: Item;
    isMastered: boolean;
    counts: Record<string, number>;
    onToggleMastered: (item: Item) => void;
    onIncrement: (uniqueName: string) => void;
    onDecrement: (uniqueName: string) => void;
    onSetValue: (uniqueName: string, value: number) => void;
}

function gridItemPropsAreEqual(prev: GridItemProps, next: GridItemProps) {
    if (prev.item !== next.item) return false;
    if (prev.isMastered !== next.isMastered) return false;
    if (
        prev.onToggleMastered !== next.onToggleMastered ||
        prev.onIncrement !== next.onIncrement ||
        prev.onDecrement !== next.onDecrement ||
        prev.onSetValue !== next.onSetValue
    ) return false;

    if (prev.counts === next.counts) return true;

    // Only bail out (i.e. re-render) if a count THIS item cares about changed
    const components = next.item.components ?? [];
    for (const component of components) {
        const key = component.uniqueName;
        if (prev.counts[key] !== next.counts[key]) return false;
    }
    return true;
}

const GridItem = memo(function GridItem({
    item,
    isMastered,
    counts,
    onToggleMastered,
    onIncrement,
    onDecrement,
    onSetValue,
}: GridItemProps) {
    return (
        <div className="grid-item" data-prime={item.isPrime} data-mastered={isMastered}>
            <div className="grid-column">
                <img
                    className="item-modal-image"
                    style={{ marginBottom: "8px" }}
                    loading="lazy"
                    decoding="async"
                    src={getImageUrl(item)}
                    data-is-mastered={isMastered}
                />
                <h1 className="item-modal-title" style={{ fontSize: "18px" }}>{item.name}</h1>
                <p className="item-modal-subtitle grid-item-category" style={{ fontSize: "14px" }}>{item.category}</p>
                <button
                    className="grid-item-mastery-button"
                    onClick={() => onToggleMastered(item)}
                    style={{ fontSize: "12px" }}
                    data-is-mastered={isMastered}
                >
                    Mastered
                </button>
            </div>
            <div className="grid-column">
                {item.components?.map((component) => (
                    <ComponentRow
                        key={component.name}
                        component={component}
                        owned={counts[component.uniqueName] ?? 0}
                        onIncrement={onIncrement}
                        onDecrement={onDecrement}
                        onSetValue={onSetValue}
                    />
                ))}
            </div>
        </div>
    );
}, gridItemPropsAreEqual);

// ---------- Foundry ----------

export default function Foundry() {
    const { counts, increment, decrement, setValue } = useComponentCounts();
    const mastered = useUserStore((s) => s.data?.mastered || {});
    const update = useUserStore((s) => s.update);

    const [itemSearchText, setItemSearchText] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [primeFilter, setPrimeFilter] = useState<PrimeFilter>("all");
    const [itemGroup, setItemGroup] = useState<ItemGroup>("warframes");

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
                        <div className="filters-wrapper" style={{ position: "relative" }}>
                            <button key="filters" className="toolbar-icon-button" type="button" aria-label="filters" onClick={() => setShowFilters(!showFilters)}>
                                <Funnel size={18} weight="bold" />
                                <span className="tooltip">Filters</span>
                            </button>
                            {showFilters && (
                                <div className="filters-dropdown">
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
                                        <GridItem
                                            key={item.uniqueName}
                                            item={item}
                                            isMastered={!!mastered[item.uniqueName]}
                                            counts={counts}
                                            onToggleMastered={toggleMastered}
                                            onIncrement={handleIncrement}
                                            onDecrement={handleDecrement}
                                            onSetValue={handleSetValue}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}