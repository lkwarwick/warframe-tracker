import type { BaseItem, Buildable, Component } from "@wfcd/items"
import "./ItemCard.css"
import { FlowerLotus } from "phosphor-react";
import { MouseEvent } from 'react';

type ItemCardProps = {
    item: BaseItem & Buildable;
    isMastered: boolean;
    toggleMastered: (e: MouseEvent<HTMLButtonElement>, item: BaseItem) => void;
    onItemModal: (item: BaseItem) => void;
}

export default function ItemCard({ item, isMastered, toggleMastered, onItemModal }: ItemCardProps) {
    const IMAGE_OVERRIDES: Record<string, string> = {'/Lotus/Types/Items/MiscItems/Forma': 'Forma.png'};

    function getImageUrl(item: BaseItem | Component): string {
        const override = IMAGE_OVERRIDES[item.uniqueName];
        const imageName = override ?? item.imageName;
        return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
    }

    return (
        <div role="button" onClick={(() => onItemModal(item))} className="item-card" data-is-mastered={isMastered}>
            <img className="item-card-image" data-is-mastered={isMastered} src={getImageUrl(item)}></img>
            <h3 className="item-card-title"><FlowerLotus data-is-mastered={isMastered} className="mastery-icon" size={26} weight="bold" />{item.name}</h3>
            <button className="mastery-button" data-is-mastered={isMastered} onClick={(e) => toggleMastered(e, item)}>{isMastered ? "Mastered" : "Not Mastered"}</button>
        </div>
    )
}