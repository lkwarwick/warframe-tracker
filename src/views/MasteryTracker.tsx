import type{ Warframe } from "@wfcd/items";
import { useEffect, useState } from "react";

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
    })

    return (
        <div>
            <h2>Mastery Checklist</h2>
            <p>{warframes.length}</p>
        </div>
    )
}