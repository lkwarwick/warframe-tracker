import { createRoot } from "react-dom/client";
import Navigation from "./layout/Navigation";
import RightPanel from "./layout/RightPanel";
import HeaderPanel from "./layout/HeaderPanel";
import "./App.css"
import FooterPanel from "./layout/FooterPanel";
import MiddlePanel from "./layout/MiddlePanel";
import { useState } from "react";
import { View } from "./types/view";
import { BaseItem } from "@wfcd/items";

declare global {
    interface Window {
        api: {
            getWarframes: () => Promise<BaseItem[]>;
            getPrimaries: () => Promise<BaseItem[]>;
            getSecondaries: () => Promise<BaseItem[]>;
            getMelee: () => Promise<BaseItem[]>;
            getArchwing: () => Promise<BaseItem[]>;
            getCompanions: () => Promise<BaseItem[]>;
            // Save Data API
            getMastered: () => Promise<Record<string, true>>;
            toggleMastered: (uniqueName: string) => Promise<Record<string, true>>;
            getComponents: () => Promise<Record<string, number>>;
            incrementComponent: (uniqueName: string) => Promise<Record<string, number>>;
            decrementComponent: (uniqueName: string) => Promise<Record<string, number>>;
            setComponent: (uniqueName: string, value: number) => Promise<Record<string, number>>;
            removeComponent: (uniqueName: string) => Promise<Record<string, number>>;
            // ! Old Save Data API
            getPrimeParts: () => Promise<Record<string, number>>;
            incrementPrimePart: (partId: string) => Promise<Record<string, number>>;
            decrementPrimePart: (partId: string) => Promise<Record<string, number>>;
            removePrimePart: (partId: string) => Promise<Record<string, number>>;
          }
    }
}

function App() {

  const [activeView, setActiveView] = useState<View>("mastery-checklist");

  return (
    <div className="app">
      <header className="header">
        <HeaderPanel />
      </header>
      <main className="main">
        <div className="left"><Navigation setActiveView={setActiveView} /></div>
        <div className="middle"><MiddlePanel activeView={activeView} /></div>
        <div className="right"><RightPanel /></div>
      </main>
      <footer className="footer">
        <FooterPanel/>
      </footer>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<App />);