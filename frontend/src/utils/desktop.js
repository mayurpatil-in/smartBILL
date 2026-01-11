import { Command } from "@tauri-apps/plugin-shell";
import { isTauri } from "@tauri-apps/api/core";

export async function initDesktop() {
  if (!isTauri()) {
    console.log("Not running in Tauri, skipping desktop init.");
    return;
  }

  // [DISABLED] Sidecar is now spawned by Rust main process (lib.rs)
  // to prevent permission issues and race conditions.
  /*
  try {
    console.log("Starting backend sidecar...");
    const command = Command.sidecar("backend-server");
    const child = await command.spawn();
    console.log("Backend sidecar spawned with PID:", child.pid);

    // In the future, we could listen to stdout here to get a dynamic port.
  } catch (error) {
    console.error("Failed to spawn sidecar:", error);
  }
  */
  console.log("Sidecar management moved to Rust backend.");
}
