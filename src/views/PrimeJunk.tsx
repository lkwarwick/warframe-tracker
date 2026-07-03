import { BaseItem, Buildable, Component } from "@wfcd/items";
import { useEffect, useMemo, useState } from "react";
import "./PrimeJunk.css";
import PrimeJunkCard from "../components/PrimeJunkCard";
import { AnimatePresence, motion } from "framer-motion";

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

    const sortedParts = useMemo(() => {
        return [...parts].sort((a, b) => {
            const aCount = partData[`${a.parentName}:${a.componentName}`] ?? 0;
            const bCount = partData[`${b.parentName}:${b.componentName}`] ?? 0;
            const aHas = aCount > 0;
            const bHas = bCount > 0;

            if (aHas !== bHas) return aHas ? -1 : 1; // zero-count group first, nonzero group second

            const aName = `${a.parentName} ${a.componentName}`;
            const bName = `${b.parentName} ${b.componentName}`;
            return aName.localeCompare(bName);
        });
    }, [parts, partData]);

    const partsById = useMemo(() => {
        const map: Record<string, PrimePart> = {};
        parts.forEach(part => {
            map[`${part.parentName}:${part.componentName}`] = part;
        });
        return map;
    }, [parts]);

    const uniqueOwnedCount = useMemo(
        () => Object.values(partData).filter(count => count > 0).length,
        [partData]
    );

    const totalPartsCount = useMemo(
        () => Object.values(partData).reduce((sum, count) => sum + count, 0),
        [partData]
    );

    const totalDucats = useMemo(
        () =>
            Object.entries(partData).reduce((sum, [partId, count]) => {
            const ducats = partsById[partId]?.ducats ?? 0;
            return sum + ducats * count;
            }, 0),
        [partData, partsById]
        );

    return (
        <div className="prime-junk-view">
            <div className="toolbar-high">
                <div className="toolbar-top">
                    <div className="toolbar-left">
                        <p className="prime-junk-total">Total: {(totalPartsCount).toLocaleString("en-GB")}</p>
                        <p className="prime-junk-unique" >(Unique: {(uniqueOwnedCount).toLocaleString("en-GB")})</p>
                    </div>
                    <div className="toolbar-right">
                        <p className="prime-junk-ducats">Ducats: {(totalDucats).toLocaleString("en-GB")}</p>
                    </div>
                </div>
                <div className="toolbar-search">
                    <input type="search" placeholder="Search parts..." />
                </div>
            </div>
            <div className="prime-junk-view-grid">
                <AnimatePresence mode="popLayout">
                    {sortedParts.map(part => (
                    <motion.div
                        key={`${part.parentName}:${part.componentName}`}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.1 }}>
                        <PrimeJunkCard part={part} partData={partData} onDecrement={handleDecrement} onIncrement={handleIncrement}/>
                    </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}