import type { BaseItem, Buildable, Component } from "@wfcd/items"
import "./ItemCard.css"

type ItemCardProps = {
    item: BaseItem & Buildable
}

export default function ItemCard({ item }: ItemCardProps) {
    function handleComponentClick(component: Component) {
        console.log(`${component.uniqueName}, ${component.imageName}`);
    }

    const IMAGE_OVERRIDES: Record<string, string> = {
        '/Lotus/Types/Items/MiscItems/Forma': 'Forma.png',
    };

    function getImageUrl(item: BaseItem | Component): string {
        const override = IMAGE_OVERRIDES[item.uniqueName];
        const imageName = override ?? item.imageName;
        return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
    }

    return (
        <div className="item-card">
            <img className="item-card-image" src={getImageUrl(item)}></img>
            <h3 className="item-card-title">{item.name}</h3>
            <div className="item-card-components">
                {item.components?.map((component: Component) => (
                <button key={component.uniqueName} className="item-card-component" onClick={() => handleComponentClick(component)} type="button">
                    <img className="item-card-component-image" src={getImageUrl(component)} alt={component.name} />
                    <span className="tooltip">{component.name}</span>
                </button>
                ))}
            </div>
        </div>
    )
}