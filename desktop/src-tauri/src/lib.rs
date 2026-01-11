// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri_plugin_shell::ShellExt;


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let sidecar_command = app.shell().sidecar("backend-server").unwrap();
            let (mut _rx, _child) = sidecar_command.spawn().expect("Failed to spawn sidecar");
            
            println!("Backend sidecar spawned successfully!");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
