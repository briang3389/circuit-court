import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// disabled strict mode cus it was making all the babylon stuff render twice
createRoot(document.getElementById("root")!).render(
    //<StrictMode>
    <App />
    //</StrictMode>,
);
