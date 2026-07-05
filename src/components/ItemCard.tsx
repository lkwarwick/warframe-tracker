import type { BaseItem, Buildable, Component } from "@wfcd/items"
import "./ItemCard.css"
import { FlowerLotus } from "phosphor-react";

type ItemCardProps = {
    item: BaseItem & Buildable;
    isMastered: boolean;
    toggleMastered: (item: BaseItem) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function ItemCard({ item, isMastered, toggleMastered, onContextMenu }: ItemCardProps) {
    const IMAGE_OVERRIDES: Record<string, string> = {'/Lotus/Types/Items/MiscItems/Forma': 'Forma.png'};

    function getImageUrl(item: BaseItem | Component): string {
        const override = IMAGE_OVERRIDES[item.uniqueName];
        const imageName = override ?? item.imageName;
        return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
    }

    return (
        <div className="item-card" data-is-mastered={isMastered} onContextMenu={onContextMenu}>
            <img className="item-card-image" data-is-mastered={isMastered} src={getImageUrl(item)}></img>
            <h3 className="item-card-title"><FlowerLotus data-is-mastered={isMastered} className="mastery-icon" size={26} weight="bold" />{item.name}</h3>
            <button className="mastery-button" data-is-mastered={isMastered} onClick={() => toggleMastered(item)}>{isMastered ? "Mastered" : "Not Mastered"}</button>
        </div>
    )
}