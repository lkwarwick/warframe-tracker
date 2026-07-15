import { createRoot } from "react-dom/client";
import Navigation from "./layout/Navigation";
import RightPanel from "./layout/RightPanel";
import HeaderPanel from "./layout/HeaderPanel";
import "./App.css"
import FooterPanel from "./layout/FooterPanel";
import MiddlePanel from "./layout/MiddlePanel";
import { useEffect, useState } from "react";
import { View } from "./types/view";
import { useUserStore } from "./persistence/userStore";
import { loadFromGist } from "./persistence/gistSync";
import { saveUserDataIfDirty, forceSaveUserData } from "./persistence/autoSave";
import type { UserData } from "./persistence/userStore";


declare global {
    interface Window {
        api: {
            // Components
            getComponents: () => Promise<Record<string, number>>;
            incrementComponent: (uniqueName: string) => Promise<Record<string, number>>;
            decrementComponent: (uniqueName: string) => Promise<Record<string, number>>;
            setComponent: (uniqueName: string, value: number) => Promise<Record<string, number>>;
            removeComponent: (uniqueName: string) => Promise<Record<string, number>>;
            onForceSave: (cb: () => Promise<boolean>) => void;
          }
    }
}

function App() {
  const [activeView, setActiveView] = useState<View>("mastery-checklist");
  const [isBooting, setIsBooting] = useState(true);
  const [bootError, setBootError] = useState<Error | null>(null);
  const [isForcingSave, setIsForcingSave] = useState(false);

  const hydrate = useUserStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      console.log("Loading user data...");

      try {
        const data = await loadFromGist();

        if (cancelled) {
          return;
        }

        console.log("Loaded data:", data);
        hydrate(data as UserData);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const nextError = error instanceof Error ? error : new Error(String(error));
        console.error("Failed to load user data", nextError);
        setBootError(nextError);
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void saveUserDataIfDirty();
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (typeof window.api?.onForceSave === "function") {
      window.api.onForceSave(async () => {
        try {
          setIsForcingSave(true);
          // Attempt a forced save on close so data is persisted even if not marked dirty
          const result = await forceSaveUserData();
          return result;
        } catch {
          return false;
        } finally {
          setIsForcingSave(false);
        }
      });
    }
  }, []);

  if (isBooting) {
    return (
      <div className="app load-save-data-state">
        <div className="load-save-data-card">
          <p className="load-save-data-title">Loading save data...</p>
        </div>
      </div>
    );
  }

  if (isForcingSave) {
    return (
      <div className="app load-save-data-state">
        <div className="load-save-data-card">
          <p className="load-save-data-title">Saving data...</p>
          <p className="load-save-data-message">Saving your data to GitHub Gist — please wait.</p>
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="app load-save-data-state">
        <div className="load-save-data-card load-save-data-card--error">
          <p className="load-save-data-title">Unable to load save data</p>
          <p className="load-save-data-message">{bootError.message}</p>
        </div>
      </div>
    );
  }

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