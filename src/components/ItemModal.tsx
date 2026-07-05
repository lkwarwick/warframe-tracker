import { BaseItem } from "@wfcd/items";
import "./ItemModal.css";

interface ItemModalProps {
    item: BaseItem | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ItemModal({ item, isOpen, onClose }: ItemModalProps) {
    if (!isOpen || !item) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose}>Close</button>
                <h2>{item.name}</h2>
            </div>
        </div>
    );
}