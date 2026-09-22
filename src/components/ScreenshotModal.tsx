import { useEffect, useState } from "react";
import { Trash, X } from "phosphor-react";
import "./ScreenshotModal.css";
import { recognizeScreenshot, type OcrCardResult, type OcrProgress } from "./screenshotOcr";
import { EMPTY_COMPONENTS, EMPTY_MASTERED, useUserStore } from "../persistence/userStore";

interface ScreenshotModalProps {
    path: string;
    dataUrl: string;
    canDelete: boolean;
    onClose: () => void;
}

export default function ScreenshotModal({ path, dataUrl, canDelete, onClose }: ScreenshotModalProps) {
    const [isProcessingSelection, setIsProcessingSelection] = useState(false);
    const [ocrResults, setOcrResults] = useState<OcrCardResult[]>([]);
    const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
    const [ocrError, setOcrError] = useState<string | null>(null);
    const mastered = useUserStore((state) => state.data?.mastered ?? EMPTY_MASTERED);
    const components = useUserStore((state) => state.data?.components ?? EMPTY_COMPONENTS);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        let cancelled = false;
        setOcrResults([]);
        setOcrError(null);
        setOcrProgress({ card: 0, totalCards: 4, status: "Starting OCR", progress: 0 });

        void recognizeScreenshot(dataUrl, (progress) => {
            if (!cancelled) setOcrProgress(progress);
        })
            .then((results) => {
                console.info("[screenshot-modal] OCR completed.", { results });
                if (!cancelled) {
                    setOcrResults(results);
                    setOcrProgress(null);
                }
            })
            .catch((error: unknown) => {
                console.error("[screenshot-modal] OCR failed.", error);
                if (!cancelled) {
                    setOcrProgress(null);
                    setOcrError(error instanceof Error ? error.message : "OCR failed.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [dataUrl]);

    async function deleteAndClose() {
        setIsProcessingSelection(true);
        try {
            const deleted = await window.api.deleteScreenshot(path);
            if (!deleted && canDelete) {
                console.error(`[screenshot-modal] Screenshot deletion failed: ${path}`);
                return;
            }
            onClose();
        } catch (error) {
            console.error(`[screenshot-modal] Screenshot deletion threw: ${path}`, error);
        } finally {
            setIsProcessingSelection(false);
        }
    }

    async function handleDelete() {
        await deleteAndClose();
    }

    async function handleRewardSelection(componentUniqueName: string) {
        console.info(`[screenshot-modal] Adding selected component: ${componentUniqueName}`);
        useUserStore.getState().update((prev) => ({
            components: {
                ...prev.components,
                [componentUniqueName]: (prev.components[componentUniqueName] ?? 0) + 1,
            },
        }));
        await deleteAndClose();
    }

    return (
        <div className="screenshot-modal-backdrop" onClick={onClose}>
            <section
                className="screenshot-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Warframe screenshot"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="screenshot-modal-header">
                    <h2>Warframe Screenshot</h2>
                    <div className="screenshot-modal-actions">
                                        {canDelete && (
                                            <button className="screenshot-modal-delete" type="button" onClick={() => void handleDelete()} disabled={isProcessingSelection} aria-label="Close and delete screenshot">
                                                <Trash size={20} weight="bold" />
                                            </button>
                                        )}
                        <button className="screenshot-modal-close" type="button" onClick={onClose} aria-label="Close screenshot">
                            <X size={22} weight="bold" />
                        </button>
                    </div>
                </div>
                <img className="screenshot-modal-image" src={dataUrl} alt="Warframe screenshot captured with F6" />
                <div className="screenshot-ocr-panel">
                    <div className="screenshot-ocr-heading">
                        <h3>Detected Rewards</h3>
                        {ocrProgress && <span>{ocrProgress.status} {ocrProgress.card > 0 ? `${ocrProgress.card}/${ocrProgress.totalCards}` : ""}</span>}
                    </div>
                    {ocrError && <p className="screenshot-ocr-error">{ocrError}</p>}
                    {!ocrError && !ocrProgress && ocrResults.length > 0 && (
                        <div className="screenshot-ocr-results">
                            {ocrResults.flatMap((result, index) => {
                                const match = result.matches[0];
                                if (!match) return [];

                                const owned = match.componentUniqueName
                                    ? components[match.componentUniqueName] ?? 0
                                    : 0;
                                const isMastered = match.itemUniqueName
                                    ? !!mastered[match.itemUniqueName]
                                    : false;
                                const shouldPrioritize = !isMastered
                                    && match.itemCount !== undefined
                                    && owned < match.itemCount;

                                return [
                                    <button
                                        className="screenshot-ocr-result"
                                        key={`${index}-${match.name}`}
                                        type="button"
                                        data-mastered={isMastered}
                                        data-needed={shouldPrioritize}
                                        disabled={isProcessingSelection}
                                        onClick={() => {
                                                                            if (match.componentUniqueName) {
                                                                                void handleRewardSelection(match.componentUniqueName);
                                                                            } else {
                                                                                console.warn("[screenshot-modal] Selected reward has no tracked component key.", { match });
                                                                            }
                                        }}
                                    >
                                        <span className="screenshot-ocr-card-label">Reward {String(index + 1).padStart(2, "0")}</span>
                                        <strong>{match.name}</strong>
                                        <span className="screenshot-ocr-statuses">
                                            {match.ducats !== undefined && <span className="screenshot-ocr-status screenshot-ocr-status--ducats">{match.ducats} Ducats</span>}
                                            {owned > 0 && <span className="screenshot-ocr-status screenshot-ocr-status--owned">Owned {owned}</span>}
                                        </span>
                                    </button>,
                                ];
                            })}
                        </div>
                    )}
                </div>
                <p className="screenshot-modal-path" title={path}>{path}</p>
            </section>
        </div>
    );
}