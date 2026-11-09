import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise } from "phosphor-react";
import "./RightPanel.css";

const FISSURES_URL = "https://api.warframestat.us/pc/fissures";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const TIER_ORDER: Record<string, number> = {
    Lith: 0,
    Meso: 1,
    Neo: 2,
    Axi: 3,
    Requiem: 4,
    Omnia: 5,
};

type Fissure = {
    id: string;
    node: string;
    missionType: string;
    tier: string;
    expiry: string;
    isHard: boolean;
    isStorm: boolean;
};

function isFissure(value: unknown): value is Fissure {
    if (typeof value !== "object" || value === null) return false;
    const fissure = value as Record<string, unknown>;
    return typeof fissure.id === "string"
        && typeof fissure.node === "string"
        && typeof fissure.missionType === "string"
        && typeof fissure.tier === "string"
        && typeof fissure.expiry === "string"
        && Number.isFinite(Date.parse(fissure.expiry))
        && typeof fissure.isHard === "boolean"
        && typeof fissure.isStorm === "boolean";
}

function formatTimeRemaining(milliseconds: number): string {
    const minutes = Math.max(0, Math.ceil(milliseconds / 60_000));
    if (minutes < 1) return "<1m";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

function RightPanel() {
    const [fissures, setFissures] = useState<Fissure[]>([]);
    const [now, setNow] = useState(() => Date.now());
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const requestInFlight = useRef(false);

    const refresh = useCallback(async () => {
        if (requestInFlight.current) return;
        requestInFlight.current = true;
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(FISSURES_URL, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(`Fissure service returned HTTP ${response.status}.`);
            }

            const payload: unknown = await response.json();
            if (!Array.isArray(payload) || !payload.every(isFissure)) {
                throw new Error("Fissure service returned data in an unexpected format.");
            }

            const updatedAt = Date.now();
            setFissures(payload);
            setNow(updatedAt);
            setLastUpdated(updatedAt);
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : "Unknown network error.";
            console.error("[fissures] Failed to refresh fissures.", caughtError);
            setError(message);
        } finally {
            requestInFlight.current = false;
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
        const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
        const clock = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => {
            window.clearInterval(interval);
            window.clearInterval(clock);
        };
    }, [refresh]);

    const nextExpiry = useMemo(() => fissures.reduce<number | null>((soonest, fissure) => {
        const expiry = Date.parse(fissure.expiry);
        if (expiry <= Date.now()) return soonest;
        return soonest === null || expiry < soonest ? expiry : soonest;
    }, null), [fissures]);

    useEffect(() => {
        if (nextExpiry === null) return;
        const timeout = window.setTimeout(() => {
            setNow(Date.now());
            void refresh();
        }, Math.max(0, nextExpiry - Date.now()) + 1000);
        return () => window.clearTimeout(timeout);
    }, [nextExpiry, refresh]);

    const activeFissures = fissures.filter((fissure) => Date.parse(fissure.expiry) > now);
    const sortByTier = (items: Fissure[]) => [...items].sort((a, b) => (
        (TIER_ORDER[a.tier] ?? Number.MAX_SAFE_INTEGER) - (TIER_ORDER[b.tier] ?? Number.MAX_SAFE_INTEGER)
        || a.node.localeCompare(b.node)
    ));
    const standardFissures = sortByTier(activeFissures.filter((fissure) => !fissure.isHard && !fissure.isStorm));
    const steelPathFissures = sortByTier(activeFissures.filter((fissure) => fissure.isHard && !fissure.isStorm));
    const railjackStorms = sortByTier(activeFissures.filter((fissure) => fissure.isStorm));

    const renderFissureList = (items: Fissure[]) => {
        if (items.length === 0) {
            return <p className="fissure-empty">No active fissures</p>;
        }

        return (
            <div className="fissure-list">
                {items.map((fissure) => (
                    <article
                        className={`fissure-row${fissure.isStorm ? " fissure-row--storm" : ""}`}
                        key={fissure.id}
                        title={`${fissure.tier} · ${fissure.node} · ${fissure.missionType}${fissure.isStorm ? " · Void Storm" : ""} · Expires in ${formatTimeRemaining(Date.parse(fissure.expiry) - now)}`}
                    >
                        <span className="fissure-tier">{fissure.tier}</span>
                        <span className="fissure-description">
                            <span className="fissure-node">{fissure.node}</span>
                            <span className="fissure-mission">
                                {fissure.missionType}{fissure.isStorm ? " · Storm" : ""}
                            </span>
                        </span>
                        <time className="fissure-expiry" dateTime={fissure.expiry}>
                            {formatTimeRemaining(Date.parse(fissure.expiry) - now)}
                        </time>
                    </article>
                ))}
            </div>
        );
    };

    return (
        <aside className="right-panel" aria-label="Void fissures">
            <header className="fissure-header">
                <div>
                    <h2>Void Fissures</h2>
                    <p className="fissure-platform">PC · Live</p>
                </div>
                <button
                    className={`fissure-refresh${isLoading ? " is-loading" : ""}`}
                    type="button"
                    onClick={() => void refresh()}
                    disabled={isLoading}
                    aria-label="Refresh fissures"
                    title="Refresh fissures"
                >
                    <ArrowClockwise size={16} weight="bold" />
                </button>
            </header>

            <div className="fissure-status" aria-live="polite">
                {error ? (
                    <span className="fissure-error" title={error}>
                        {lastUpdated ? "Refresh failed · showing last data" : "Could not load fissures"}
                    </span>
                ) : lastUpdated ? (
                    <span>Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                ) : (
                    <span>Loading fissures...</span>
                )}
            </div>

            {error && !lastUpdated && (
                <button className="fissure-retry" type="button" onClick={() => void refresh()} disabled={isLoading}>
                    Try again
                </button>
            )}

            <div className="fissure-groups">
                <section className="fissure-group fissure-group--standard" aria-labelledby="standard-fissures-title">
                    <h3 id="standard-fissures-title">
                        <span>Star Chart</span>
                        <span className="fissure-count">{standardFissures.length}</span>
                    </h3>
                    {renderFissureList(standardFissures)}
                </section>

                <section className="fissure-group fissure-group--steel-path" aria-labelledby="steel-path-fissures-title">
                    <h3 id="steel-path-fissures-title">
                        <span>Steel Path</span>
                        <span className="fissure-count">{steelPathFissures.length}</span>
                    </h3>
                    {renderFissureList(steelPathFissures)}
                </section>

                <section className="fissure-group fissure-group--storms" aria-labelledby="railjack-storms-title">
                    <h3 id="railjack-storms-title">
                        <span>Railjack Storms</span>
                        <span className="fissure-count">{railjackStorms.length}</span>
                    </h3>
                    {renderFissureList(railjackStorms)}
                </section>
            </div>
        </aside>
    );
}

export default RightPanel;
