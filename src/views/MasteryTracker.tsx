import type{ BaseItem } from "@wfcd/items";
import { useEffect, useState } from "react";
import { User, Crosshair, SquaresFour, Circle, Sword, Rocket, PawPrint } from "phosphor-react";
import ItemCard from "../components/ItemCard";
import "./MasteryTracker.css";
import { AnimatePresence, motion } from "framer-motion";

declare global {
    interface Window {
        api: {
            getWarframes: () => Promise<BaseItem[]>;
            getPrimaries: () => Promise<BaseItem[]>;
            getSecondaries: () => Promise<BaseItem[]>;
            getMelee: () => Promise<BaseItem[]>;
            getArchwing: () => Promise<BaseItem[]>;
            getCompanions: () => Promise<BaseItem[]>;
            getProgress: () => Promise<{ selectedComponents: Record<string, true> }>;
            toggleComponent: (parentId: string, componentId: string) => Promise<{ selectedComponents: Record<string, true> }>;
        }
    }
}

export type ItemGroup = "all" | "warframes" | "primaries" | "secondaries" | "melee" | "archwing" | "companions"

export default function MasteryTracker() {
    const [itemSearchText, setItemSearchText] = useState<string>("");
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
        .filter(item =>
            item.name.toLowerCase().includes(itemSearchText.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="item-card-grid-container">
            <div className="item-card-toolbar">
                <div className="item-card-toolbar-top">
                    <div className="item-card-toolbar-left">
                        {groups.map(({ key, label, icon: Icon }) => (
                            <button key={key} className="item-card-toolbar-icon-button" type="button" aria-label={label} onClick={() => setItemGroup(key)}>
                                <Icon size={18} weight="bold" />
                                <span className="tooltip">{label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="item-card-toolbar-right">
                        <button>Filters</button>
                    </div>
                </div>
                <div className="item-card-toolbar-search">
                    <input type="search" onChange={(e) => setItemSearchText(e.target.value)} placeholder="Search items..." />
                    <p>{itemSearchText}</p>
                </div>
            </div>
            <div className="item-card-grid">
                <AnimatePresence mode="wait">
                    {filteredItems.map(item => (
                    <motion.div
                        key={item.uniqueName}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.1 }}>
                        <ItemCard item={item} />
                    </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}