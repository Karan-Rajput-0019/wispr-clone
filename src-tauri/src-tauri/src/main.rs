// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, GlobalShortcutManager, Manager, SystemTray, SystemTrayEvent,
    SystemTrayMenu, WindowEvent, WindowUrl,
};

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
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("toggle_main".to_string(), "Show/Hide"))
        .add_item(CustomMenuItem::new(
            "toggle_recording".to_string(),
            "Start/Stop Dictation (Ctrl+Shift+Space)",
        ))
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));

    tauri::Builder::default()
        .system_tray(SystemTray::new().with_menu(tray_menu))
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "toggle_main" => {
                    if let Some(w) = app.get_window("main") {
                        if w.is_visible().unwrap_or(true) {
                            let _ = w.hide();
                        } else {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                }
                "toggle_recording" => {
                    if let Some(overlay) = app.get_window("overlay") {
                        let _ = overlay.show();
                    }
                    let _ = app.emit_all("toggle-recording", ());
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            // overlay window
            let _overlay = tauri::WindowBuilder::new(
                app,
                "overlay",
                WindowUrl::App("index.html?overlay=1".into()),
            )
            .title("wispr")
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .resizable(false)
            .skip_taskbar(true)
            .visible(false)
            .inner_size(520.0, 84.0)
            .build()?;

            // global hotkey
            let handle = app.handle();

            app.global_shortcut_manager()
                .register("Ctrl+Shift+Space", move || {
                    if let Some(overlay) = handle.get_window("overlay") {
                        let _ = overlay.show();
                    }
                    let _ = handle.emit_all("toggle-recording", ());
                })?;

            Ok(())
        })
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { api, .. } = event.event() {
                if event.window().label() == "overlay" {
                    return;
                }

                api.prevent_close();
                let _ = event.window().hide();
            }
        })
        .invoke_handler(tauri::generate_handler![inject_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

