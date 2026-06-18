import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
import "@ui/theme/tokens.css";
import "@ui/theme/global.css";
import { boot } from "./boot";
import App from "./App";

const root = document.getElementById("root") as HTMLElement;

boot()
  .then(() => {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((e) => {
    console.error("Caja: boot failed", e);
    root.innerHTML =
      '<div style="padding:24px;font-family:sans-serif">No se pudo iniciar Caja.</div>';
  });
