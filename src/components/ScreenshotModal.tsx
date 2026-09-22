import { useEffect, useState } from "react";
import { Trash, X } from "phosphor-react";
import "./ScreenshotModal.css";

interface ScreenshotModalProps {
    path: string;
    dataUrl: string;
    canDelete: boolean;
    onClose: () => void;
}

export default function ScreenshotModal({ path, dataUrl, canDelete, onClose }: ScreenshotModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    async function handleDelete() {
        setIsDeleting(true);
        const deleted = await window.api.deleteScreenshot(path);
        setIsDeleting(false);
        if (deleted) onClose();
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
                                            <button className="screenshot-modal-delete" type="button" onClick={() => void handleDelete()} disabled={isDeleting} aria-label="Close and delete screenshot">
                                                <Trash size={20} weight="bold" />
                                            </button>
                                        )}
                        <button className="screenshot-modal-close" type="button" onClick={onClose} aria-label="Close screenshot">
                            <X size={22} weight="bold" />
                        </button>
                    </div>
                </div>
                <img className="screenshot-modal-image" src={dataUrl} alt="Warframe screenshot captured with F6" />
                <p className="screenshot-modal-path" title={path}>{path}</p>
            </section>
        </div>
    );
}