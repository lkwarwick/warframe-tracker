import { createRoot } from "react-dom/client";
import LeftPanel from "./panels/LeftPanel";
import MiddlePanel from "./panels/MiddlePanel";
import RightPanel from "./panels/RightPanel";
import HeaderPanel from "./panels/HeaderPanel";
import "./App.css"
import FooterPanel from "./panels/FooterPanel";

function App() {
  return (
    <div className="app">
      <header className="header">
        <HeaderPanel />
      </header>
      <main className="main">
        <div className="left"><LeftPanel /></div>
        <div className="middle"><MiddlePanel /></div>
        <div className="right"><RightPanel /></div>
      </main>
      <footer className="footer">
        <FooterPanel/>
      </footer>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<App />);