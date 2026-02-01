import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPWAAuthStorage } from "./utils/pwaAuthStorage";

// Initialize PWA auth storage before rendering (restores session from IndexedDB if needed)
initPWAAuthStorage().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
