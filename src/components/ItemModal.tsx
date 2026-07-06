import { BaseItem, Buildable, Component } from "@wfcd/items";
import "./ItemModal.css";
import { FlowerLotus } from "phosphor-react";

interface ItemModalProps {
    item: (BaseItem & Buildable) | null;
    isMastered: boolean;
    toggleMastered: (e: React.MouseEvent<HTMLButtonElement>, item: BaseItem) => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function ItemModal({ item, isMastered, toggleMastered, isOpen, onClose }: ItemModalProps) {
    if (!isOpen || !item) return null;

    function getImageUrl(item: BaseItem | Component): string {
        return `https://cdn.warframestat.us/img/${item.imageName}`;
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="item-modal-header">
                    <button onClick={onClose}>Close</button>
                </div>
                <div className="item-modal-body">
                    <div className="item-modal-left">
                    <img className="item-modal-image" src={getImageUrl(item)}></img>
                    <h1 className="item-modal-title"><FlowerLotus data-is-mastered={isMastered} className="item-modal-mastery-icon" size={26} weight="bold" />{item.name}</h1>
                    <p className="item-modal-subtitle">{item.category}</p>
                    <button className="item-modal-mastery-button" onClick={(e) => toggleMastered(e, item)} data-is-mastered={isMastered}>Mastered</button>
                    <div className="item-modal-key-value">
                        <h6>Mastery Rank</h6>
                        <p>{item.masteryReq}</p>
                    </div>
                    <hr />
                    <div className="item-modal-key-value">
                        <h6>Release Date</h6>
                        <p>{item.releaseDate}</p>
                    </div>
                    <hr />
                    <p className="item-modal-description">{item.description}</p>
                    <hr />
                </div>
                <div className="item-modal-right">
                    <div className="item-modal-components"></div>
                </div>
                </div>
            </div>
        </div>
    );
}