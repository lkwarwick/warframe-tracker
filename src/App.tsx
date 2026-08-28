import { createRoot } from "react-dom/client";
import Navigation from "./layout/Navigation";
import RightPanel from "./layout/RightPanel";
import HeaderPanel from "./layout/HeaderPanel";
import "./App.css"
import FooterPanel from "./layout/FooterPanel";
import MiddlePanel from "./layout/MiddlePanel";
import { useEffect, useState } from "react";
import { View } from "./types/view";
import { createEmptyUserData, useUserStore, type UserData } from "./persistence/userStore";


declare global {
    interface Window {
        api: {
            // Components
            getComponents: () => Promise<Record<string, number>>;
            incrementComponent: (uniqueName: string) => Promise<Record<string, number>>;
            decrementComponent: (uniqueName: string) => Promise<Record<string, number>>;
            setComponent: (uniqueName: string, value: number) => Promise<Record<string, number>>;
            removeComponent: (uniqueName: string) => Promise<Record<string, number>>;
            loadUserData: () => Promise<UserData>;
            saveUserData: (data: UserData) => Promise<boolean>;
            onForceSave: (cb: () => Promise<boolean>) => void;
          }
    }
}

function App() {
  const [activeView, setActiveView] = useState<View>("mastery-checklist");
  const data = useUserStore((state) => state.data);
  const hydrate = useUserStore((state) => state.hydrate);
  const markClean = useUserStore((state) => state.markClean);

  useEffect(() => {
    let mounted = true;
    window.api.loadUserData()
      .then((savedData) => {
        if (mounted) hydrate(savedData ?? createEmptyUserData());
      })
      .catch(() => {
        if (mounted) hydrate(createEmptyUserData());
      });
    return () => { mounted = false; };
  }, [hydrate]);

  useEffect(() => {
    if (!data) return;
    void window.api.saveUserData(data).then((saved) => {
      if (saved && useUserStore.getState().data === data) markClean();
    });
  }, [data, markClean]);

  useEffect(() => {
    window.api.onForceSave(async () => {
      const currentData = useUserStore.getState().data;
      if (!currentData) return true;
      return window.api.saveUserData(currentData);
    });
  }, []);

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
