import type { Item } from "../data/types.ts";
import { useState, MouseEvent } from "react";
import { User, Crosshair, SquaresFour, Circle, Sword, Rocket, PawPrint, Funnel } from "phosphor-react";
import ItemCard from "../components/ItemCard";
import "./MasteryTracker.css";
import { AnimatePresence, motion } from "framer-motion";
import ProgressBar from "../components/ProgressBar";
import ItemModal from "../components/ItemModal";
import { all, archwing, companions, melee, primaries, secondaries, warframes } from "../data/items";
import { useUserStore } from "../persistence/userStore.js";

export type ItemGroup = "all" | "warframes" | "primaries" | "secondaries" | "melee" | "archwing" | "companions"
export type PrimeFilter = "all" | "prime-only" | "non-prime-only"

export default function MasteryTracker() {
    const mastered = useUserStore((s) => s.data?.mastered || {});
    const update = useUserStore((s) => s.update);

    const toggleMastered = (e: MouseEvent<HTMLButtonElement>, item: Item) => {
        e.stopPropagation();
        
        const nextMastered = { ...mastered };
        
        if (nextMastered[item.uniqueName]) {
            delete nextMastered[item.uniqueName];
        } else {
            nextMastered[item.uniqueName] = true;
        }
        
        update({ mastered: nextMastered });
    };

    // Filters
    const [itemSearchText, setItemSearchText] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [primeFilter, setPrimeFilter] = useState<PrimeFilter>("all");

    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    const openItemModal = (item: Item) => {
        setSelectedItem(item);
    };

    const closeItemModal = () => {
        setSelectedItem(null);
    };

    const [itemGroup, setItemGroup] = useState<ItemGroup>("warframes");
    const itemsByGroup = {
        all: all,
        warframes: warframes,
        primaries: primaries,
        secondaries: secondaries,
        melee: melee,
        archwing: archwing,
        companions: companions,
    };

    const groups: { key: ItemGroup; label: string; icon: any }[] = [
        { key: "all", label: "All", icon: SquaresFour },
        { key: "warframes", label: "Warframes", icon: User },
        { key: "primaries", label: "Primaries", icon: Crosshair },
        { key: "secondaries", label: "Secondaries", icon: Circle },
        { key: "melee", label: "Melee", icon: Sword },
        { key: "archwing", label: "Archwing", icon: Rocket },
        { key: "companions", label: "Companions", icon: PawPrint },
    ];

    const items = itemsByGroup[itemGroup];
    const filteredItems = items
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
                        <ItemCard item={item} isMastered={mastered[item.uniqueName]} toggleMastered={toggleMastered} onItemModal={openItemModal} />
                    </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <div className="toolbar-low">
                <ProgressBar name={itemGroup} value={items.filter(item => mastered[item.uniqueName]).length} max={items.length} />
            </div>
            <ItemModal item={selectedItem} isMastered={mastered[selectedItem?.uniqueName ?? ""]} toggleMastered={toggleMastered} isOpen={selectedItem !== null} onClose={closeItemModal} />
        </div>
    )
}