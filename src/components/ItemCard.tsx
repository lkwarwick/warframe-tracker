import type { BaseItem } from "@wfcd/items"
import "./ItemCard.css"

type ItemCardProps = {
    item: BaseItem
}

export default function ItemCard({ item }: ItemCardProps) {
    return (
        <div className="item-card">
            <img className="item-card-image" src={`https://cdn.warframestat.us/img/${item.imageName}`}></img>
            <h3 className="item-card-title">{item.name}</h3>
        </div>
    )
}