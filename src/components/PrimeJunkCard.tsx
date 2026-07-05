import { FlowerLotus } from "phosphor-react";
import { PrimePart } from "../views/PrimeJunk";
import "./PrimeJunkCard.css"

const IMAGE_OVERRIDES: Record<string, string> = {
    '/Lotus/Types/Items/MiscItems/Forma': 'Forma.png',
};

function getImageUrl(part: PrimePart) {
    const override = IMAGE_OVERRIDES[part.parentUniqueName ?? part.uniqueName ?? ''];
    const imageName = override ?? (part.imageName as string | undefined);
    return imageName ? `https://cdn.warframestat.us/img/${imageName}` : '/fallback-icon.png';
}

type PrimeJunkCardProps = {
    isCompleted: boolean;
    part: PrimePart;
    partData: Record<string, number>;
    onDecrement: (part: PrimePart) => void;
    onIncrement: (part: PrimePart) => void;
}

export default function PrimeJunkCard({ isCompleted, part, partData, onDecrement, onIncrement }: PrimeJunkCardProps) {

    const key = `${part.parentName}:${part.componentName}`;
    const count = partData[key] ?? 0;
    const nonzero = count > 0;

    return (
        <div className="prime-junk-card" data-nonzero={nonzero}>
            <img
                className="prime-junk-image"
                data-nonzero={nonzero}
                src={getImageUrl(part)}
                alt={`${part.parentName} ${part.componentName}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/fallback-icon.png'; }}
            />
            <h3 className="prime-junk-title" data-nonzero={nonzero}>
                {isCompleted ? <FlowerLotus data-nonzero={nonzero} size={22} weight="bold" className="prime-completed-icon" /> : null}
                {' '}
                <strong>{part.parentName}</strong> {part.componentName} ({part.ducats})
            </h3>
            <div className="prime-junk-counter">
                <button className="prime-junk-decrement" disabled={!nonzero} onClick={() => onDecrement(part)}>-</button>
                <h4 className="prime-junk-value" data-nonzero={nonzero}>{count}</h4>
                <button className="prime-junk-increment" onClick={() => onIncrement(part)}>+</button>
            </div>
        </div>
    )
}