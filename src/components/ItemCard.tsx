import type { BaseItem, Buildable, Component } from "@wfcd/items"
import "./ItemCard.css"
import type { MasteryProgress } from "../views/MasteryTracker";

type ItemCardProps = {
    item: BaseItem & Buildable;
    progress: MasteryProgress;
    onToggleComponent: (parentId: string, componentId: string) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function ItemCard({ item, progress, onToggleComponent, onContextMenu }: ItemCardProps) {
    const hasComponents = !!item.components && item.components.length > 0;
    const trackableIDs = hasComponents
        ? item.components!.map(c => `${item.uniqueName}:${c.uniqueName}`)
        : [`${item.uniqueName}:${item.uniqueName}`];
    const isItemComplete = trackableIDs.every(id => progress.selectedComponents[id]);

    const IMAGE_OVERRIDES: Record<string, string> = {
        '/Lotus/Types/Items/MiscItems/Forma': 'Forma.png',
    };

    function getImageUrl(item: BaseItem | Component): string {
        const override = IMAGE_OVERRIDES[item.uniqueName];
        const imageName = override ?? item.imageName;
        return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
    }

    return (
        <div className={`item-card ${isItemComplete ? "item-card-completed" : ""}`} onContextMenu={onContextMenu}>
            <img className="item-card-image" src={getImageUrl(item)}></img>
            <h3 className="item-card-title">{item.name}</h3>
            <div className="item-card-components">
                {
                    item.components?.map((component: Component) => {
                        const isDone = !!progress.selectedComponents[`${item.uniqueName}:${component.uniqueName}`];
                        return (
                            <button key={component.uniqueName} className={`item-card-component ${isDone ? "item-card-component-completed" : ""}`} onClick={() => onToggleComponent(item.uniqueName, component.uniqueName)} type="button">
                                <img className="item-card-component-image" src={getImageUrl(component)} alt={component.name} />
                                <span className="tooltip">{component.name}</span>
                            </button>
                        )
                    })
                }
            </div>
        </div>
    )
}