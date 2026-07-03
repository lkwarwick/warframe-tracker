import "./ProgressBar.css"

type ProgressBarProps = {
    name: string;
    value: number;
    max: number;
}

export default function ProgressBar({ name, value, max}: ProgressBarProps) {
    const pct = Math.round(Math.min(100, (value / max) * 100) * 10) / 10;

    return (
        <div className="progress-card">
            <div className="progress-header">
                <span className="progress-left">{name}</span>
                <span className="progress-right">{Math.floor(value)}/{max} ({pct}%)</span>
            </div>
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${pct}%`}}></div>
            </div>
        </div>
    )
}