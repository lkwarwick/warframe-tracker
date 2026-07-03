import { BaseItem, Buildable, Component } from "@wfcd/items";
import { useEffect, useState } from "react";
import "./PrimeJunk.css";
import PrimeJunkCard from "../components/PrimeJunkCard";

type FullItem = BaseItem & Buildable;
export type PrimePart = BaseItem & Buildable & Component & {
    parentName: string;
    componentName: string;
};

export default function PrimeJunk() {

    const [parts, setParts] = useState<PrimePart[]>([]);
    const [partData, setPartData] = useState<Record<string, number>>({});

    function handleIncrement(part: PrimePart) {
        window.api.incrementPrimePart(`${part.parentName}:${part.componentName}`).then(setPartData);
    }

    function handleDecrement(part: PrimePart) {
        window.api.decrementPrimePart(`${part.parentName}:${part.componentName}`).then(setPartData);
    }

    useEffect(() => {
        Promise.all([
            window.api.getWarframes(),
            window.api.getPrimaries(),
            window.api.getSecondaries(),
            window.api.getMelee(),
            window.api.getArchwing(),
            window.api.getCompanions(),
            window.api.getPrimeParts(),
        ]).then(([warframes, primaries, secondaries, melee, archwing, companions, primeJunk]) => {
            const allItems: FullItem[] = [...warframes, ...primaries, ...secondaries, ...melee, ...archwing, ...companions];

            const primeParts: PrimePart[] = allItems.flatMap(item =>
                (item.components ?? [])
                    .filter(c => typeof c.ducats === 'number' && c.ducats > 0)
                    .map(c => ({
                        ...item,
                        ...c,
                        parentName: item.name,
                        componentName: c.name,
                    }))
            );

            setParts(primeParts);
            setPartData(primeJunk)
        });
    }, []);

    return (
        <div className="prime-junk-view">
            <div className="toolbar-high">
                <div className="toolbar-top">
                    <div className="toolbar-left">
                        <p>left</p>
                    </div>
                    <div className="toolbar-right">
                        <p>right</p>
                    </div>
                </div>
                <div className="toolbar-search">
                    <input type="search" placeholder="Search parts..." />
                </div>
            </div>
            <div className="prime-junk-view-grid">
                {parts.map(part => ( <PrimeJunkCard key={`${part.parentName}:${part.componentName}`} part={part} partData={partData} onDecrement={handleDecrement} onIncrement={handleIncrement}/> ))}
            </div>
        </div>
    )
}