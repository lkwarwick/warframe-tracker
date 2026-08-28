import { memo } from "react";
import type { BaseItem, Component } from "@wfcd/items";
import { CheckCircle, XCircle } from "phosphor-react";
import type { Item } from "../data/types";
import "./FoundryItemCard.css";

const IMAGE_OVERRIDES: Record<string, string> = { '/Lotus/Types/Items/MiscItems/Forma': 'Forma.png' };

function getImageUrl(item: BaseItem | Component): string {
    const override = IMAGE_OVERRIDES[item.uniqueName];
    const imageName = override ?? item.imageName;
    return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
}

interface ComponentRowProps {
    component: Component;
    owned: number;
    onIncrement: (uniqueName: string) => void;
    onDecrement: (uniqueName: string) => void;
    onSetValue: (uniqueName: string, value: number) => void;
}

const ComponentRow = memo(function ComponentRow({
    component,
    owned,
    onIncrement,
    onDecrement,
    onSetValue,
}: ComponentRowProps) {
    const haveComponent = owned >= component.itemCount;
    const HaveIcon = haveComponent ? CheckCircle : XCircle;

    return (
        <div className="item-modal-component grid-item-component">
            <span className="component-image-tooltip" tabIndex={0} role="img" aria-label={component.name}>
                <img className="item-modal-component-image" src={getImageUrl(component)} style={{ width: "40px" }} />
                <span className="tooltip">{component.name}</span>
            </span>
            <h5 className="item-modal-component-text" style={{ width: "100px" }}>{component.name}</h5>
            <div className="item-modal-component-owned">
                <input
                    type="number"
                    value={owned}
                    min="0"
                    onChange={(event) => onSetValue(component.uniqueName, Number(event.target.value))}
                />
                <div className="grid-item-component-controls">
                    <button onClick={() => onIncrement(component.uniqueName)}>+</button>
                    <button onClick={() => onDecrement(component.uniqueName)}>-</button>
                </div>
            </div>
            <p className="item-modal-component-needed" style={{ width: "30px" }}>{component.itemCount}</p>
            <HaveIcon
                style={{ width: "25px", marginRight: "12px" }}
                data-have-component={haveComponent}
                className="item-modal-component-have"
                size={26}
                weight="bold"
            />
        </div>
    );
});

export interface FoundryItemCardProps {
    item: Item;
    isMastered: boolean;
    counts: Record<string, number>;
    onToggleMastered: (item: Item) => void;
    onIncrement: (uniqueName: string) => void;
    onDecrement: (uniqueName: string) => void;
    onSetValue: (uniqueName: string, value: number) => void;
    onItemModal: (item: Item) => void;
}

function foundryItemCardPropsAreEqual(prev: FoundryItemCardProps, next: FoundryItemCardProps) {
    if (prev.item !== next.item) return false;
    if (prev.isMastered !== next.isMastered) return false;
    if (
        prev.onToggleMastered !== next.onToggleMastered ||
        prev.onIncrement !== next.onIncrement ||
        prev.onDecrement !== next.onDecrement ||
        prev.onSetValue !== next.onSetValue ||
        prev.onItemModal !== next.onItemModal
    ) return false;

    if (prev.counts === next.counts) return true;

    const components = next.item.components ?? [];
    for (const component of components) {
        const key = component.uniqueName;
        if (prev.counts[key] !== next.counts[key]) return false;
    }
    return true;
}

const FoundryItemCard = memo(function FoundryItemCard({
    item,
    isMastered,
    counts,
    onToggleMastered,
    onIncrement,
    onDecrement,
    onSetValue,
    onItemModal,
}: FoundryItemCardProps) {
    return (
        <div className="grid-item" data-prime={item.isPrime} data-mastered={isMastered}>
            <div className="grid-column" role="button" tabIndex={0} onClick={() => onItemModal(item)} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onItemModal(item);
            }}>
                <img
                    className="item-modal-image"
                    style={{ marginBottom: "8px" }}
                    loading="lazy"
                    decoding="async"
                    src={getImageUrl(item)}
                    data-is-mastered={isMastered}
                />
                <h1 className="item-modal-title" style={{ fontSize: "18px" }}>{item.name}</h1>
                <p className="item-modal-subtitle grid-item-category" style={{ fontSize: "14px" }}>{item.category}</p>
                <button
                    className="grid-item-mastery-button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleMastered(item);
                    }}
                    style={{ fontSize: "12px" }}
                    data-is-mastered={isMastered}
                >
                    Mastered
                </button>
            </div>
            <div className="grid-column">
                {item.components?.map((component) => (
                    <ComponentRow
                        key={component.name}
                        component={component}
                        owned={counts[component.uniqueName] ?? 0}
                        onIncrement={onIncrement}
                        onDecrement={onDecrement}
                        onSetValue={onSetValue}
                    />
                ))}
            </div>
        </div>
    );
}, foundryItemCardPropsAreEqual);

export default FoundryItemCard;