import type{ BaseItem, Warframe } from "@wfcd/items";
import { useEffect, useState } from "react";
import { User, Crosshair } from "phosphor-react";
import ItemCard from "../components/ItemCard";
import "./MasteryTracker.css";

declare global {
    interface Window {
        api: {
            getWarframes: () => Promise<Warframe[]>;
            getPrimaries: () => Promise<BaseItem[]>;
        }
    }
}

export type ItemGroup = "warframes" | "primaries"

export default function MasteryTracker() {
    const [warframes, setWarframes] = useState<Warframe[]>([]);
    const [primaries, setPrimaries] = useState<BaseItem[]>([])

    const [itemGroup, setItemGroup] = useState<ItemGroup>("warframes");
    const [itemSearchText, setItemSearchText] = useState<string>("");

    useEffect(() => {
        window.api.getWarframes().then(setWarframes);
        window.api.getPrimaries().then(setPrimaries);
    }, []);


    const itemSources: Record<ItemGroup, BaseItem[]> = { warframes, primaries };
    const filteredItems = itemSources[itemGroup].filter(item => item.name.toLowerCase().includes(itemSearchText.toLowerCase()));

    return (
        <div className="item-card-grid-container">
            <div className="item-card-toolbar">
                <div className="item-card-toolbar-top">
                    <div className="item-card-toolbar-left">
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
                        <button>Filters</button>
                    </div>
                </div>
                <div className="item-card-toolbar-search">
                    <input type="search" onChange={(e) => setItemSearchText(e.target.value)} placeholder="Search items..." />
                    <p>{itemSearchText}</p>
                </div>
            </div>
            <div className="item-card-grid">
                {
                    filteredItems.map(item => (
                        <ItemCard item={item} />
                    ))
                }
            </div>
        </div>
    )
}