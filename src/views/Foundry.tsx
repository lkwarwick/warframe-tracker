import type { BaseItem, Buildable, Component, Item } from "@wfcd/items"
import { AnimatePresence, motion } from "framer-motion"
import { warframes } from "../data/items"
import "./Foundry.css"
import { CheckCircle, FlowerLotus, XCircle } from "phosphor-react";
import { useComponentCounts } from "../hooks/useComponentCounts";
import { useUserStore } from "../persistence/userStore";

export default function Foundry() {
    const IMAGE_OVERRIDES: Record<string, string> = {'/Lotus/Types/Items/MiscItems/Forma': 'Forma.png'};

    const { counts, increment, decrement, setValue } = useComponentCounts();
    const mastered = useUserStore((s) => s.data?.mastered || {});
    const update = useUserStore((s) => s.update);
    
    function getImageUrl(item: BaseItem | Component): string {
        const override = IMAGE_OVERRIDES[item.uniqueName];
        const imageName = override ?? item.imageName;
        return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
    }

    const toggleMastered = (e: React.MouseEvent<HTMLButtonElement>, item: Item) => {
        e.stopPropagation();
        
        const nextMastered = { ...mastered };
        
        if (nextMastered[item.uniqueName]) {
            delete nextMastered[item.uniqueName];
        } else {
            nextMastered[item.uniqueName] = true;
        }
        
        update({ mastered: nextMastered });
    };

    return (
        <div className="grid-container">
            <div className="grid">
                <AnimatePresence mode="popLayout">
                {warframes.map(item => (
                    <motion.div
                        key={item.uniqueName}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.1 }}>
                        <div className="grid-item" data-prime={item.isPrime} data-mastered={mastered[item.uniqueName]}>
                            <div className="grid-column">
                                <img className="item-modal-image" style={{ marginBottom: "8px" }} src={getImageUrl(item)} data-is-mastered={mastered[item.uniqueName]}></img>
                                <h1 className="item-modal-title" style={{ fontSize: "18px" }}>{item.name}</h1>
                                <p className="item-modal-subtitle grid-item-category" style={{ fontSize: "14px" }}>{item.category}</p>
                                <button className="grid-item-mastery-button" onClick={(e) => toggleMastered(e, item)} style={{ fontSize: "12px" }} data-is-mastered={mastered[item.uniqueName]}>Mastered</button>
                            </div>
                            <div className="grid-column">
                                {item.components?.map((component) => {
                                    const owned = counts[component.uniqueName] ?? 0;
                                    const haveComponent = owned >= component.itemCount;
                                    const HaveIcon = haveComponent ? CheckCircle : XCircle;

                                    return (
                                    <div className="item-modal-component grid-item-component" key={component.name}>
                                        <img className="item-modal-component-image" src={getImageUrl(component)} style={{ width: "40px" }}></img>
                                        <h5 className="item-modal-component-text" style={{ width: "100px" }}>{component.name}</h5>
                                        <div className="item-modal-component-owned">
                                            <button onClick={() => decrement(component.uniqueName)}>-</button>
                                            <input type="number" value={owned} min="0" onChange={(e) => setValue(component.uniqueName, Number(e.target.value))} />
                                            <button onClick={() => increment(component.uniqueName)}>+</button>
                                        </div>
                                        <p className="item-modal-component-needed" style={{ width: "30px" }}>{component.itemCount}</p>
                                        <HaveIcon style={{ width: "25px", marginRight: "12px" }} data-have-component={haveComponent} className="item-modal-component-have" size={26} weight="bold" />
                                    </div>
                                )
                                })}
                            </div>
                        </div>
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
        </div>
    )
}