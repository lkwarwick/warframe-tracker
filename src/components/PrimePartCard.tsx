import { FlowerLotus } from "phosphor-react";
import { PrimePart } from "../views/PrimeParts";
import "./PrimePartCard.css"

const IMAGE_OVERRIDES: Record<string, string> = {
    '/Lotus/Types/Items/MiscItems/Forma': 'Forma.png',
};

function getImageUrl(part: PrimePart) {
    const override = IMAGE_OVERRIDES[part.parentUniqueName ?? part.uniqueName ?? ''];
    const imageName = override ?? (part.imageName as string | undefined);
    return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
}

type PrimePartCardProps = {
    isCompleted: boolean;
    part: PrimePart;
    counts: Record<string, number>;
    onDecrement: (uniqueName: string) => void;
    onIncrement: (uniqueName: string) => void;
}

export default function PrimePartCard({ isCompleted, part, counts, onDecrement, onIncrement }: PrimePartCardProps) {

    const key = part.uniqueName;
    const count = counts[key] ?? 0;
    const nonzero = count > 0;

    return (
        <div className="prime-part-card" data-nonzero={nonzero}>
            <img
                className="prime-part-image"
                data-nonzero={nonzero}
                src={getImageUrl(part)}
                alt={`${part.parentName} ${part.componentName}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/fallback-icon.png'; }}
            />
            <h3 className="prime-part-title" data-nonzero={nonzero}>
                {isCompleted ? <FlowerLotus data-nonzero={nonzero} size={22} weight="bold" className="prime-completed-icon" /> : null}
                {' '}
                <strong>{part.parentName}</strong> {part.componentName} ({part.ducats})
            </h3>
            <div className="prime-part-counter">
                <button className="prime-part-decrement" disabled={!nonzero} onClick={() => onDecrement(part.uniqueName)}>-</button>
                <h4 className="prime-part-value" data-nonzero={nonzero}>{count}</h4>
                <button className="prime-part-increment" onClick={() => onIncrement(part.uniqueName)}>+</button>
            </div>
        </div>
    )
}