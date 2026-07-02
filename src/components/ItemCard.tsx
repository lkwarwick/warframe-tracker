import type { BaseItem } from "@wfcd/items"
import "./ItemCard.css"

type ItemCardProps = {
    item: BaseItem
}

export default function ItemCard({ item }: ItemCardProps) {
    return (
        <div className="item-card">
            <h3>{item.name}</h3>
            <p>{item.uniqueName}</p>
        </div>
    )
}