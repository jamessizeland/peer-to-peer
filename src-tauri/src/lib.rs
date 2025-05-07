#[cfg(debug_assertions)] // only include this code on debug builds
use tauri::Manager as _;

mod chat;
mod ipc;
mod state;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .pretty()
        .with_ansi(false)
        .init();

    tracing::info!("Starting app");

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(state::AppContext::new()) // Register the state with Tauri
        .setup(|_app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            _app.get_webview_window("main").unwrap().open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::init_context,
            ipc::create_room,
            ipc::join_room,
            ipc::send_message,
            ipc::leave_room,
            ipc::get_latest_ticket,
            ipc::disconnect,
            ipc::get_peers,
            ipc::get_node_id,
            ipc::set_nickname,
            ipc::get_nickname,
        ])
        .run(tauri::generate_context!()) // Run the Tauri application
        .expect("error while running tauri application");
}
