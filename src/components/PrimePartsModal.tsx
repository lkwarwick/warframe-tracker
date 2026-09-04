import { Package, Trash, X } from "phosphor-react";
import type { PrimePartEntry } from "../types/view";
import "./PrimePartsModal.css";

interface PrimePartsModalProps {
    entries: PrimePartEntry[];
    isOpen: boolean;
    onClear: () => void;
    onClose: () => void;
}

function getImageUrl(imageName?: string): string {
    return imageName ? `https://cdn.warframestat.us/img/${imageName}` : "/fallback-icon.png";
}

export default function PrimePartsModal({ entries, isOpen, onClear, onClose }: PrimePartsModalProps) {
    if (!isOpen) return null;

    const totalOwned = entries.reduce((total, entry) => total + entry.owned, 0);
    const totalDucats = entries.reduce((total, entry) => total + entry.ducats * entry.owned, 0);

    return (
        <div className="prime-parts-backdrop" onClick={onClose}>
            <div className="prime-parts-modal" role="dialog" aria-modal="true" aria-labelledby="prime-parts-title" onClick={(event) => event.stopPropagation()}>
                <header className="prime-parts-header">
                    <div>
                        <p className="prime-parts-eyebrow"><Package size={16} weight="bold" /> Baro inventory</p>
                        <h2 id="prime-parts-title">Prime Parts</h2>
                        <p className="prime-parts-summary">
                            {entries.length === 0 ? "No sellable Prime parts in your inventory." : `${entries.length} part${entries.length === 1 ? "" : "s"} - ${totalOwned} total owned - ${totalDucats} total Ducats`}
                        </p>
                    </div>
                    <button className="prime-parts-close" type="button" aria-label="Close Prime Parts" onClick={onClose}>
                        <X size={20} weight="bold" />
                    </button>
                </header>
                <div className="prime-parts-list">
                    {entries.map((entry) => (
                        <div className="prime-part-row" key={entry.uniqueName}>
                            <img src={getImageUrl(entry.imageName)} alt="" />
                            <div className="prime-part-details">
                                <strong>{entry.name}</strong>
                            </div>
                            <div className="prime-part-values">
                                <strong className="prime-part-ducats">{entry.ducats} x {entry.owned} = {entry.ducats * entry.owned} <span>Ducats</span></strong>
                            </div>
                        </div>
                    ))}
                </div>
                <footer className="prime-parts-footer">
                    <button className="prime-parts-clear" type="button" disabled={entries.length === 0} onClick={onClear}>
                        <Trash size={17} weight="bold" /> Remove all listed parts
                    </button>
                </footer>
            </div>
        </div>
    );
}