import { useEffect } from "react";
import { resolve, appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { setupLogger } from "./lib/logs";
import InitialPage from "./landing/landing";


import "./App.css";

function App() {

  setupLogger();

  useEffect(() => {
  const init = async () => {
    const appDataDirPath = await appDataDir();

    const path = await resolve(appDataDirPath,'cases.db');
    await invoke('init_db', { path });
  };

  init();
  }, []);

  

  return (
    <main className="container">
      <InitialPage />
    </main>
  );
}

export default App;
