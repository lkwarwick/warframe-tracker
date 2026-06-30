import { createRoot } from "react-dom/client";

function App() {
  return <h1>Hello Electron + React</h1>;
}

createRoot(document.getElementById("root")!).render(<App />);