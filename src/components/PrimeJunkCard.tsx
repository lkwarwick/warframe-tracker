import { PrimePart } from "../views/PrimeJunk";
import "./PrimeJunkCard.css"

type PrimeJunkCardProps = {
    part: PrimePart;
    partData: Record<string, number>;
    onDecrement: (part: PrimePart) => void;
    onIncrement: (part: PrimePart) => void;
}

export default function PrimeJunkCard({ part, partData, onDecrement, onIncrement }: PrimeJunkCardProps) {

    const key = `${part.parentName}:${part.componentName}`;
    const count = partData[key] ?? 0;
    const nonzero = count > 0;

    return (
        <div className="prime-junk-card" data-nonzero={nonzero}>
            <img className="prime-junk-image" data-nonzero={nonzero} src={`https://cdn.warframestat.us/img/${part.imageName}`}></img>
            <h3 className="prime-junk-title" data-nonzero={nonzero}><strong>{part.parentName}</strong> {part.componentName} ({part.ducats})</h3>
            <div className="prime-junk-counter">
                <button className="prime-junk-decrement" disabled={!nonzero} onClick={() => onDecrement(part)}>-</button>
                <h4 className="prime-junk-value" data-nonzero={nonzero}>{count}</h4>
                <button className="prime-junk-increment" onClick={() => onIncrement(part)}>+</button>
            </div>
        </div>
    )
}