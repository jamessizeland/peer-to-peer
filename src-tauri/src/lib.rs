mod chat;
mod ipc;
mod state;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(state::AppContext::new()) // Register the state with Tauri
        .invoke_handler(tauri::generate_handler![
            ipc::init_context,
            ipc::create_room,
            ipc::join_room,
            ipc::send_message,
            ipc::leave_room,
            ipc::disconnect,
            ipc::get_peers,
            ipc::get_node_id,
            ipc::set_nickname,
        ])
        .run(tauri::generate_context!()) // Run the Tauri application
        .expect("error while running tauri application");
}
