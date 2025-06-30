import { useEffect } from "react";
import { resolve, appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { setupLogger } from "./lib/logs";
import InitialPage from "./landing/landing";
import { AssignedToProvider, useAssignedTo } from "./lib/assignedContext";

import "./App.css";

function AppContent() {

    setupLogger();
    const { fetchOptions } = useAssignedTo();

    useEffect(() => {
    const init = async () => {
      try {
        const appDataDirPath = await appDataDir();
        const path = await resolve(appDataDirPath, "cases.db");

        await invoke("init_db", { path });
        console.log("✅ Database initialized at:", path);

        await fetchOptions(); // Now safe — DB is ready
      } catch (error) {
        console.error("❌ Failed to initialize DB:", error);
      }
    };

    init();
    }, [fetchOptions]);


  return (
    <main className="container">
      <InitialPage />
    </main>
  );
}

function App() {


  return (
    <AssignedToProvider>
      <AppContent />
    </AssignedToProvider>
  );
}

export default App;

