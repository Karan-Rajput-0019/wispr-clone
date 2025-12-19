#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::Manager;

#[tauri::command]
fn inject_text(text: String) -> Result<(), String> {
  use enigo::{Enigo, KeyboardControllable};

  let mut enigo = Enigo::new();
  // Type the text into the active window
  enigo
    .text(&text)
    .map_err(|e| format!("Failed to inject text: {:?}", e))?;
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![inject_text])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
