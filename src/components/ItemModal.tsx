import { BaseItem, Buildable, Component } from "@wfcd/items";
import "./ItemModal.css";
import { FlowerLotus, CheckCircle, XCircle } from "phosphor-react";
import { useComponentCounts } from "../hooks/useComponentCounts";

interface ItemModalProps {
    item: (BaseItem & Buildable) | null;
    isMastered: boolean;
    toggleMastered: (e: React.MouseEvent<HTMLButtonElement>, item: BaseItem) => void;

    isOpen: boolean;
    onClose: () => void;
}

export default function ItemModal({ item, isMastered, toggleMastered, isOpen, onClose }: ItemModalProps) {
    const { counts, increment, decrement, setValue } = useComponentCounts();
    
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
                    <img className="item-modal-image" data-is-mastered={isMastered} src={getImageUrl(item)}></img>
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
                    <div className="item-modal-components-header">
                        <div className="item-modal-components-header-image"></div>
                        <h4 className="item-modal-components-header-name">COMPONENT NAME</h4>
                        <h4 className="item-modal-components-header-owned">OWNED</h4>
                        <h4 className="item-modal-components-header-needed">NEEDED</h4>
                        <h4 className="item-modal-components-header-have">HAVE?</h4>
                    </div>
                    <div className="item-modal-components">
                        {item.components?.map((component) => {
                            const owned = counts[component.uniqueName] ?? 0;
                            const haveComponent = owned >= component.itemCount;
                            const HaveIcon = haveComponent ? CheckCircle : XCircle;

                            return (
                            <div className="item-modal-component" key={component.name}>
                                <img className="item-modal-component-image" src={getImageUrl(component)}></img>
                                <h5 className="item-modal-component-text">{component.name}</h5>
                                <div className="item-modal-component-owned">
                                    <button onClick={() => decrement(component.uniqueName)}>-</button>
                                    <input type="number" value={owned} min="0" onChange={(e) => setValue(component.uniqueName, Number(e.target.value))} />
                                    <button onClick={() => increment(component.uniqueName)}>+</button>
                                </div>
                                <p className="item-modal-component-needed">{component.itemCount}</p>
                                <HaveIcon data-have-component={haveComponent} className="item-modal-component-have" size={26} weight="bold" />
                            </div>
                        )
                        })}
                        <p className="item-modal-component-info">Components are shared across all items.</p>
                    </div>
                    <div className="item-modal-info-boxes">
                        <div className="item-modal-info-box"></div>
                        <div className="item-modal-info-box"></div>
                        <div className="item-modal-info-box"></div>
                        <div className="item-modal-info-box"></div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}