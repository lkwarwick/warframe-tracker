import type{ Warframe } from "@wfcd/items";
import { useEffect, useState } from "react";
import ItemCard from "../components/ItemCard";
import "./MasterTracker.css";

declare global {
    interface Window {
        api: {
            getWarframes: () => Promise<Warframe[]>;
        }
    }
}

export default function MasterTracker() {
    const [warframes, setWarframes] = useState<Warframe[]>([])

    useEffect(() => {
        window.api.getWarframes().then(setWarframes);
    }, [])

    return (
        <div className="item-card-grid-container">
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