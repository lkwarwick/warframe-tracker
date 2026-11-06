import { createRoot } from "react-dom/client";
import Navigation from "./layout/Navigation";
import RightPanel from "./layout/RightPanel";
import HeaderPanel from "./layout/HeaderPanel";
import "./App.css"
import FooterPanel from "./layout/FooterPanel";
import MiddlePanel from "./layout/MiddlePanel";
import { lazy, Suspense, useEffect, useState } from "react";
import { View } from "./types/view";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createEmptyUserData, useUserStore } from "./persistence/userStore";
import { loadUserData, onScreenshot, saveUserData, saveWindowState, type ScreenshotCapture } from "./lib/desktop";

const ScreenshotModal = lazy(() => import("./components/ScreenshotModal"));

function App() {
  const [activeView, setActiveView] = useState<View>("foundry");
  const [screenshot, setScreenshot] = useState<ScreenshotCapture | null>(null);
  const data = useUserStore((state) => state.data);
  const hydrate = useUserStore((state) => state.hydrate);
  const markClean = useUserStore((state) => state.markClean);

  useEffect(() => {
    let mounted = true;
    loadUserData()
      .then((savedData) => {
        if (mounted) hydrate(savedData ?? createEmptyUserData());
      }).catch((error: unknown) => {
        console.error("[app] Failed to load saved user data.", error);
        if (mounted) hydrate(createEmptyUserData());
      });
    return () => { mounted = false; };
  }, [hydrate]);

  useEffect(() => {
    if (!data) return;
    void saveUserData(data)
      .then(() => {
        if (useUserStore.getState().data === data) markClean();
      })
      .catch((error: unknown) => console.error("[app] Failed to save user data.", error));
  }, [data, markClean]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void onScreenshot((capture) => {
        setScreenshot(null);
        window.setTimeout(() => setScreenshot(capture), 0);
      }).then((stopListening) => {
        if (cancelled) stopListening();
        else unlisten = stopListening;
      }).catch((error: unknown) => console.error("[app] Failed to listen for screenshots.", error));
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let closing = false;
    const currentWindow = getCurrentWindow();
    const unlisten = currentWindow.onCloseRequested(async (event) => {
      if (closing) return;
      event.preventDefault();
      try {
        const currentData = useUserStore.getState().data;
        if (currentData) await saveUserData(currentData);
        await saveWindowState();
      } catch (error) {
        console.error("[app] Failed to save application state before closing.", error);
      }
      closing = true;
      try {
        await currentWindow.destroy();
      } catch (error) {
        closing = false;
        console.error("[app] Failed to close the application window.", error);
      }
    });
    return () => {
      void unlisten.then((stopListening) => stopListening());
    };
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
      {screenshot && (
        <Suspense fallback={null}>
          <ScreenshotModal
            key={screenshot.path}
            path={screenshot.path}
            dataUrl={screenshot.dataUrl}
            canDelete={screenshot.canDelete}
            onClose={() => setScreenshot(null)}
          />
        </Suspense>
      )}
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<App />);
