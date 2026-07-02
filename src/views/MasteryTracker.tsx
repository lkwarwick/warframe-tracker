import type{ Warframe } from "@wfcd/items";
import { useEffect, useState } from "react";
import ItemCard from "../components/ItemCard";
import "./MasteryTracker.css";

declare global {
    interface Window {
        api: {
            getWarframes: () => Promise<Warframe[]>;
        }
    }
}

export default function MasteryTracker() {
    const [warframes, setWarframes] = useState<Warframe[]>([])

    useEffect(() => {
        window.api.getWarframes().then(setWarframes);
    }, [])

    return (
        <div className="item-card-grid-container">
            <div className="item-card-toolbar">
                <div className="item-card-toolbar-top">
                    <div className="item-card-toolbar-left">
                        <button>Warframes</button>
                    </div>
                    <div className="item-card-toolbar-right">
                        <button>Filters</button>
                    </div>
                </div>
                <div className="item-card-toolbar-search">
                    <input type="search" placeholder="Search items..." />
                </div>
            </div>
            <div className="item-card-grid">
                {
                    warframes.map(warframe => (
                        <ItemCard item={warframe} />
                    ))
                }
            </div>
        </div>
    )
}