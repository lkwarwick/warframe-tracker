import { BaseItem, Buildable, Component } from "@wfcd/items";
import { useEffect, useMemo, useState } from "react";
import "./PrimeParts.css";
import PrimePartCard from "../components/PrimePartCard";
import { AnimatePresence, motion } from "framer-motion";
import { useComponentCounts } from "../hooks/useComponentCounts";

type FullItem = BaseItem & Buildable;
export type PrimePart = BaseItem & Buildable & Component & {
    parentName: string;
    componentName: string;
    parentUniqueName: string;
    componentUniqueName: string;
};

export default function PrimeParts() {

    // Loaded parts to display (loads once, never set again)
    const [parts, setParts] = useState<PrimePart[]>([]);

    // Load the mastery data
    const [mastered, setMastered] = useState<Record<string, true>>({});

    // Load the player's components
    const { counts, increment, decrement, setValue } = useComponentCounts();

    const [itemSearchText, setItemSearchText] = useState<string>("");

    useEffect(() => {
        Promise.all([
            window.api.getWarframes(),
            window.api.getPrimaries(),
            window.api.getSecondaries(),
            window.api.getMelee(),
            window.api.getArchwing(),
            window.api.getCompanions(),
        ]).then(([warframes, primaries, secondaries, melee, archwing, companions]) => {
            const allItems: FullItem[] = [...warframes, ...primaries, ...secondaries, ...melee, ...archwing, ...companions];

            const primeParts: PrimePart[] = allItems.flatMap(item =>
                (item.components ?? [])
                    .filter(c => typeof c.ducats === 'number' && c.ducats > 0)
                    .map(c => ({
                        ...item,
                        ...c,
                        parentName: item.name,
                        componentName: c.name,
                        parentUniqueName: item.uniqueName,
                        componentUniqueName: c.uniqueName,
                    }))
            );

            setParts(primeParts);
        });
    }, []);

    useEffect(() => {
        window.api.getMastered().then(setMastered);
    }, []);

    const sortedParts = useMemo(() => {
        const search = itemSearchText.trim().toLowerCase();

        const filtered = search
            ? parts.filter(part =>
                `${part.parentName} ${part.componentName}`.toLowerCase().includes(search)
            )
            : parts;

        return [...filtered].sort((a, b) => {
            const aCount = counts[a.uniqueName] ?? 0;
            const bCount = counts[b.uniqueName] ?? 0;
            const aHas = aCount > 0;
            const bHas = bCount > 0;
            if (aHas !== bHas) return aHas ? -1 : 1; // zero-count group first, nonzero group second
            const aName = `${a.parentName} ${a.componentName}`;
            const bName = `${b.parentName} ${b.componentName}`;
            return aName.localeCompare(bName);
        });
    }, [parts, counts, itemSearchText]);

    const partsById = useMemo(() => {
        const map: Record<string, PrimePart> = {};
        parts.forEach(part => {
            map[part.uniqueName] = part;
        });
        return map;
    }, [parts]);

    const primeCounts = useMemo(
        () => Object.fromEntries(
            Object.entries(counts).filter(([id]) => id in partsById)
        ),
        [counts, partsById]
    );

    const uniqueOwnedCount = useMemo(
        () => Object.values(primeCounts).filter(count => count > 0).length,
        [primeCounts]
    );

    const totalPartsCount = useMemo(
        () => Object.values(primeCounts).reduce((sum, count) => sum + count, 0),
        [primeCounts]
    );

    const totalDucats = useMemo(
        () =>
            Object.entries(primeCounts).reduce((sum, [partId, count]) => {
            const ducats = partsById[partId]?.ducats ?? 0;
            return sum + ducats * count;
            }, 0),
        [primeCounts, partsById]
        );

    return (
        <div className="prime-parts-view">
            <div className="toolbar-high">
                <div className="toolbar-top">
                    <div className="toolbar-left">
                        <p className="prime-parts-total">Total: {(totalPartsCount).toLocaleString("en-GB")}</p>
                        <p className="prime-parts-unique" >(Unique: {(uniqueOwnedCount).toLocaleString("en-GB")})</p>
                    </div>
                    <div className="toolbar-right">
                        <p className="prime-parts-ducats">Ducats: {(totalDucats).toLocaleString("en-GB")}</p>
                    </div>
                </div>
                <div className="toolbar-search">
                    <input type="search" placeholder="Search parts..." value={itemSearchText} onChange={e => setItemSearchText(e.target.value)} />
                </div>
            </div>
            <div className="prime-parts-view-grid">
                <AnimatePresence mode="popLayout">
                    {sortedParts.map(part => (
                    <motion.div
                        key={`${part.parentName}:${part.componentName}`}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.1 }}>
                        <PrimePartCard
                            isCompleted={mastered[part.parentUniqueName]}
                            part={part}
                            counts={counts}
                            onDecrement={decrement}
                            onIncrement={increment}
                        />
                    </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}