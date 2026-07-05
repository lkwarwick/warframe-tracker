import type{ BaseItem, Buildable } from "@wfcd/items";
import { useEffect, useState } from "react";
import { User, Crosshair, SquaresFour, Circle, Sword, Rocket, PawPrint, Funnel } from "phosphor-react";
import ItemCard from "../components/ItemCard";
import "./MasteryTracker.css";
import { AnimatePresence, motion } from "framer-motion";
import ProgressBar from "../components/ProgressBar";
import { useContextMenu, ContextMenu, ContextMenuItem, ContextMenuDivider } from "../components/ContextMenu";

export type ItemGroup = "all" | "warframes" | "primaries" | "secondaries" | "melee" | "archwing" | "companions"
export type PrimeFilter = "all" | "prime-only" | "non-prime-only"

export default function MasteryTracker() {
    const [progress, setProgress] = useState<Record<string, true>>({});

    function handleToggleComponent(parentId: string, componentId: string) {
        window.api.toggleComponent(parentId, componentId).then(setProgress);
    }

    function markAllAsComplete(item: BaseItem & Buildable) {
        const hasComponents = !!item.components && item.components.length > 0;
        const trackableIDs = hasComponents
            ? item.components!.map(c => `${item.uniqueName}:${c.uniqueName}`)
            : [`${item.uniqueName}:${item.uniqueName}`];

        const uniqueTrackableIDs = new Set(trackableIDs);

        uniqueTrackableIDs.forEach(id => {
            if (!progress[id]) {          // was progress.selectedComponents[id]
            const [parentId, componentId] = id.split(":");
            handleToggleComponent(parentId, componentId);
            }
        });
    }

    // Filters
    const [itemSearchText, setItemSearchText] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [primeFilter, setPrimeFilter] = useState<PrimeFilter>("all");

    const [itemGroup, setItemGroup] = useState<ItemGroup>("warframes");
    const [itemsByGroup, setItemsByGroup] = useState<Record<ItemGroup, BaseItem[]>>({
        all: [],
        warframes: [],
        primaries: [],
        secondaries: [],
        melee: [],
        archwing: [],
        companions: [],
    });

    useEffect(() => {
        Promise.all([
            window.api.getWarframes(),
            window.api.getPrimaries(),
            window.api.getSecondaries(),
            window.api.getMelee(),
            window.api.getArchwing(),
            window.api.getCompanions(),
        ]).then(([warframes, primaries, secondaries, melee, archwing, companions]) => {
            setItemsByGroup({
                all: [...warframes, ...primaries, ...secondaries, ...melee, ...archwing, ...companions],
                warframes,
                primaries,
                secondaries,
                melee,
                archwing,
                companions,
            });
        });
    }, []);

    useEffect(() => {
        window.api.getProgress().then(setProgress);
    }, []);

    const groups: { key: ItemGroup; label: string; icon: any }[] = [
        { key: "all", label: "All", icon: SquaresFour },
        { key: "warframes", label: "Warframes", icon: User },
        { key: "primaries", label: "Primaries", icon: Crosshair },
        { key: "secondaries", label: "Secondaries", icon: Circle },
        { key: "melee", label: "Melee", icon: Sword },
        { key: "archwing", label: "Archwing", icon: Rocket },
        { key: "companions", label: "Companions", icon: PawPrint },
    ];

    function isItemComplete(item: BaseItem & Buildable, progress: Record<string, true>): boolean {
        const hasComponents = !!item.components && item.components.length > 0;
        const trackableIDs = hasComponents
            ? item.components!.map(c => `${item.uniqueName}:${c.uniqueName}`)
            : [`${item.uniqueName}:${item.uniqueName}`];
        return trackableIDs.every(id => progress[id]);
    }

    const items = itemsByGroup[itemGroup];
    const filteredItems = items
        .map(item => ({
            item,
            complete: isItemComplete(item, progress),
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

    const { menu, open, close } = useContextMenu<BaseItem>();

    return (
        <div className="item-card-grid-container">
            <div className="toolbar-high">
                <div className="toolbar-top">
                    <div className="toolbar-left">
                        {groups.map(({ key, label, icon: Icon }) => (
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
                                {/* filter list will go here */}
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
            <div className="item-card-grid">
                <AnimatePresence mode="popLayout">
                    {filteredItems.map(item => (
                    <motion.div
                        key={item.uniqueName}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.1 }}>
                        <ItemCard onContextMenu={(e) => open(e, item)} item={item} progress={progress} onToggleComponent={handleToggleComponent} />
                    </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            {menu && (
                <ContextMenu x={menu.x} y={menu.y} onClose={close}>
                    <ContextMenuItem onClick={() => markAllAsComplete(menu.data)}>Mark as Complete</ContextMenuItem>
                </ContextMenu>
            )}
            <div className="toolbar-low">
                <ProgressBar name={itemGroup} value={items.filter(item => isItemComplete(item as BaseItem & Buildable, progress)).length} max={items.length} />
            </div>
        </div>
    )
}