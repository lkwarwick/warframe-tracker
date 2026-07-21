import type { BaseItem, Buildable, Component, Item } from "@wfcd/items"
import { AnimatePresence, motion } from "framer-motion"
import { all, archwing, companions, melee, primaries, secondaries, warframes } from "../data/items"
import "./Foundry.css"
import { CheckCircle, Circle, Crosshair, FlowerLotus, Funnel, PawPrint, Rocket, SquaresFour, Sword, User, XCircle } from "phosphor-react";
import { useComponentCounts } from "../hooks/useComponentCounts";
import { useUserStore } from "../persistence/userStore";
import { useState } from "react";
import { ItemGroup, PrimeFilter } from "./MasteryTracker";

export default function Foundry() {
    const IMAGE_OVERRIDES: Record<string, string> = {'/Lotus/Types/Items/MiscItems/Forma': 'Forma.png'};

    const { counts, increment, decrement, setValue } = useComponentCounts();
    const mastered = useUserStore((s) => s.data?.mastered || {});
    const update = useUserStore((s) => s.update);

    const [itemSearchText, setItemSearchText] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [primeFilter, setPrimeFilter] = useState<PrimeFilter>("all");
    
    function getImageUrl(item: BaseItem | Component): string {
        const override = IMAGE_OVERRIDES[item.uniqueName];
        const imageName = override ?? item.imageName;
        return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
    }

    const toggleMastered = (e: React.MouseEvent<HTMLButtonElement>, item: Item) => {
        e.stopPropagation();
        
        const nextMastered = { ...mastered };
        
        if (nextMastered[item.uniqueName]) {
            delete nextMastered[item.uniqueName];
        } else {
            nextMastered[item.uniqueName] = true;
        }
        
        update({ mastered: nextMastered });
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
        <div className="foundry-view">
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
            <div className="grid-container">
                <div className="grid">
                    <AnimatePresence mode="popLayout">
                    {filteredItems.map(item => (
                        <motion.div
                            key={item.uniqueName}
                            layout
                            initial={{ opacity: 0, y: 12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.1 }}>
                            <div className="grid-item" data-prime={item.isPrime} data-mastered={mastered[item.uniqueName]}>
                                <div className="grid-column">
                                    <img className="item-modal-image" style={{ marginBottom: "8px" }} src={getImageUrl(item)} data-is-mastered={mastered[item.uniqueName]}></img>
                                    <h1 className="item-modal-title" style={{ fontSize: "18px" }}>{item.name}</h1>
                                    <p className="item-modal-subtitle grid-item-category" style={{ fontSize: "14px" }}>{item.category}</p>
                                    <button className="grid-item-mastery-button" onClick={(e) => toggleMastered(e, item)} style={{ fontSize: "12px" }} data-is-mastered={mastered[item.uniqueName]}>Mastered</button>
                                </div>
                                <div className="grid-column">
                                    {item.components?.map((component) => {
                                        const owned = counts[component.uniqueName] ?? 0;
                                        const haveComponent = owned >= component.itemCount;
                                        const HaveIcon = haveComponent ? CheckCircle : XCircle;

                                        return (
                                        <div className="item-modal-component grid-item-component" key={component.name}>
                                            <img className="item-modal-component-image" src={getImageUrl(component)} style={{ width: "40px" }}></img>
                                            <h5 className="item-modal-component-text" style={{ width: "100px" }}>{component.name}</h5>
                                            <div className="item-modal-component-owned">
                                                <button onClick={() => decrement(component.uniqueName)}>-</button>
                                                <input type="number" value={owned} min="0" onChange={(e) => setValue(component.uniqueName, Number(e.target.value))} />
                                                <button onClick={() => increment(component.uniqueName)}>+</button>
                                            </div>
                                            <p className="item-modal-component-needed" style={{ width: "30px" }}>{component.itemCount}</p>
                                            <HaveIcon style={{ width: "25px", marginRight: "12px" }} data-have-component={haveComponent} className="item-modal-component-have" size={26} weight="bold" />
                                        </div>
                                    )
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}