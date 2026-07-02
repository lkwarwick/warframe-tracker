import { createRoot } from "react-dom/client";
import Navigation from "./layout/Navigation";
import RightPanel from "./layout/RightPanel";
import HeaderPanel from "./layout/HeaderPanel";
import "./App.css"
import FooterPanel from "./layout/FooterPanel";
import MiddlePanel from "./layout/MiddlePanel";
import { useState } from "react";
import { View } from "./types/view";

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