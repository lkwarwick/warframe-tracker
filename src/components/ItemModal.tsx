import { BaseItem, Buildable, Component } from "@wfcd/items";
import "./ItemModal.css";
import { FlowerLotus, CheckCircle, XCircle } from "phosphor-react";
import { useComponentCounts } from "../hooks/useComponentCounts";
import relicsJson from "../../vendor/warframe-items/data/json/Relics.json";

type Relic = {
    name: string;
    vaulted?: boolean;
    rewards?: {
        rarity: string;
        item: { name: string };
    }[];
};

const relics = relicsJson as Relic[];

function getRelicsForComponent(itemName: string, componentName: string) {
    const rewardNames = componentName === "Blueprint"
        ? [`${itemName} Blueprint`]
        : [`${itemName} ${componentName}`, `${itemName} ${componentName} Blueprint`];

    const matchingRelics = relics.flatMap((relic) =>
        (relic.rewards ?? [])
            .filter((reward) => rewardNames.includes(reward.item.name))
            .map((reward) => ({ name: relic.name, rarity: reward.rarity, vaulted: relic.vaulted })),
    );
    const groupedRelics = new Map<string, (typeof matchingRelics)[number]>();

    for (const relic of matchingRelics) {
        const baseName = relic.name.replace(/ (Intact|Exceptional|Flawless|Radiant)$/, "");
        if (!groupedRelics.has(baseName)) groupedRelics.set(baseName, { ...relic, name: baseName });
    }

    return [...groupedRelics.values()];
}

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
                        <div className="item-modal-info-box">
                            {item.isPrime && (
                                <>
                                    <h3>Relics</h3>
                                    <div className="item-modal-relics">
                                        {item.components?.map((component) => {
                                            const componentRelics = getRelicsForComponent(item.name, component.name);

                                            if (componentRelics.length === 0) return null;

                                            return (
                                                <div className="item-modal-relic-group" key={component.uniqueName}>
                                                    <h4>{component.name}</h4>
                                                    {componentRelics.map((relic) => (
                                                        <p key={`${component.uniqueName}-${relic.name}`}>
                                                            {relic.name} ({relic.rarity}){relic.vaulted && <span className="item-modal-vaulted" title="Vaulted"> (V)</span>}
                                                        </p>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
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