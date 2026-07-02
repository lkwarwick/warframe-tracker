import type{ BaseItem, Warframe } from "@wfcd/items";
import { useEffect, useState } from "react";
import { User, Crosshair, SquaresFour } from "phosphor-react";
import ItemCard from "../components/ItemCard";
import "./MasteryTracker.css";
import { AnimatePresence, motion } from "framer-motion";
import ProgressBar from "../components/ProgressBar";

declare global {
    interface Window {
        api: {
            getWarframes: () => Promise<Warframe[]>;
            getPrimaries: () => Promise<BaseItem[]>;
        }
    }
}

export type ItemGroup = "all" | "warframes" | "primaries"

export default function MasteryTracker() {
    const [warframes, setWarframes] = useState<Warframe[]>([]);
    const [primaries, setPrimaries] = useState<BaseItem[]>([])

    const [itemGroup, setItemGroup] = useState<ItemGroup>("warframes");
    const [itemSearchText, setItemSearchText] = useState<string>("");

    useEffect(() => {
        window.api.getWarframes().then(setWarframes);
        window.api.getPrimaries().then(setPrimaries);
    }, []);

    
    function toTitleCase(str: string) {
        return str.replace(
            /\w\S*/g,
            text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
        );
    }

    const itemSources: Record<ItemGroup, BaseItem[]> = { all: [...warframes, ...primaries],  warframes, primaries };
    const items = itemSources[itemGroup];
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
                        <button className="item-card-toolbar-icon-button" type="button" aria-label="All" onClick={() => setItemGroup("all")}>
                            <SquaresFour size={18} weight="bold" />
                            <span className="tooltip">All</span>
                        </button>
                        <button className="item-card-toolbar-icon-button" type="button" aria-label="Warframes" onClick={() => setItemGroup("warframes")}>
                            <User size={18} weight="bold" />
                            <span className="tooltip">Warframes</span>
                        </button>
                        <button className="item-card-toolbar-icon-button" type="button" aria-label="Primaries" onClick={() => setItemGroup("primaries")}>
                            <Crosshair size={18} weight="bold" />
                            <span className="tooltip">Primaries</span>
                        </button>
                    </div>
                    <div className="item-card-toolbar-right">
                        <ProgressBar name={toTitleCase(itemGroup)} value={items.length * 0.75} max={items.length} />
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