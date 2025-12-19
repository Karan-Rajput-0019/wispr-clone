// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{GlobalShortcutManager, Manager};

#[tauri::command]
fn inject_text(text: String) -> Result<(), String> {
  let text = text.trim().to_string();
  if text.is_empty() {
    return Ok(());
  }

  use enigo::{Enigo, KeyboardControllable};

  let mut enigo = Enigo::new();
  enigo
    .text(&text)
    .map_err(|e| format!("Failed to inject text: {:?}", e))?;

  Ok(())
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // Wispr Flow-style global hotkey to toggle recording.
      // NOTE: Requires OS-level permissions/availability on some platforms.
      let handle = app.handle();

      app
        .global_shortcut_manager()
        .register("Ctrl+Shift+Space", move || {
          // Fire-and-forget; the frontend decides whether to start/stop.
          let _ = handle.emit_all("toggle-recording", ());
        })?;

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![inject_text])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
