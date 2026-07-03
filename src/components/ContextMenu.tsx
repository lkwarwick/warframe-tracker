import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import "./ContextMenu.css";

export interface ContextMenuState<T> {
  x: number;
  y: number;
  data: T;
}

// --- Hook: attach this to any element via its returned handler ---
export function useContextMenu<T>() {
  const [menu, setMenu] = useState<ContextMenuState<T> | null>(null);

  const open = useCallback((e: React.MouseEvent, data: T) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, data });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  return { menu, open, close };
}

// Lets ContextMenuItem auto-close the menu after firing its own onClick,
// without you having to call `close` yourself in every handler.
const MenuCloseContext = createContext<() => void>(() => {});

// --- Reusable menu component ---
export interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}

export function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // close on outside click / Escape
  useEffect(() => {
    const handleClick = () => onClose();
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // clamp to viewport so it doesn't render off-screen
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const clampedX = Math.min(x, window.innerWidth - rect.width - 8);
    const clampedY = Math.min(y, window.innerHeight - rect.height - 8);
    setPos({ x: clampedX, y: clampedY });
  }, [x, y]);

  return (
    <MenuCloseContext.Provider value={onClose}>
      <div
        ref={ref}
        className="context-menu"
        onClick={(e) => e.stopPropagation()}
        style={{ top: pos.y, left: pos.x }}
      >
        {children}
      </div>
    </MenuCloseContext.Provider>
  );
}

// --- Individual item, used as a child of ContextMenu ---
export interface ContextMenuItemProps {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

export function ContextMenuItem({ onClick, disabled, danger, children }: ContextMenuItemProps) {
  const close = useContext(MenuCloseContext);

  return (
    <button
      className={`context-menu-item ${danger ? "context-menu-item-danger" : ""}`}
      onClick={() => {
        onClick();
        close();
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// --- Divider, used as a child of ContextMenu ---
export function ContextMenuDivider() {
  return <div className="context-menu-divider" />;
}

export default ContextMenu;