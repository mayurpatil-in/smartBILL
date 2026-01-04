import { Command } from '@tauri-apps/plugin-shell';
import { isTauri } from '@tauri-apps/api/core';

export async function initDesktop() {
  if (!isTauri()) {
    console.log("Not running in Tauri, skipping desktop init.");
    return;
  }

  try {
    console.log("Starting backend sidecar...");
    const command = Command.sidecar('backend-server');
    const child = await command.spawn();
    console.log('Backend sidecar spawned with PID:', child.pid);
    
    // In the future, we could listen to stdout here to get a dynamic port.
  } catch (error) {
    console.error('Failed to spawn sidecar:', error);
  }
}
