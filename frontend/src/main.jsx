import React from "react";
import ReactDOM from "react-dom/client";
import GridPulseApp from "./GridPulseApp.jsx";
import { AppDataProvider } from "./DataContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppDataProvider>
      <GridPulseApp />
    </AppDataProvider>
  </React.StrictMode>
);
