// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};
use enigo::{Enigo, Key, KeyboardControllable};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct DeepgramResponse {
    results: DeepgramResults,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeepgramResults {
    channels: Vec<DeepgramChannel>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeepgramChannel {
    alternatives: Vec<DeepgramAlternative>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeepgramAlternative {
    transcript: String,
}

/// Transcribe audio using Deepgram API
#[tauri::command]
async fn transcribe_audio(audio_data: String, api_key: String) -> Result<String, String> {
    // Decode base64 audio data
    let audio_bytes = base64::decode(&audio_data)
        .map_err(|e| format!("Failed to decode audio: {}", e))?;

    // Create HTTP client
    let client = reqwest::Client::new();

    // Send request to Deepgram API
    let response = client
        .post("https://api.deepgram.com/v1/listen")
        .header("Authorization", format!("Token {}", api_key))
        .header("Content-Type", "audio/webm")
        .query(&[
            ("model", "nova-2"),
            ("smart_format", "true"),
            ("punctuate", "true"),
            ("language", "en"),
        ])
        .body(audio_bytes)
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    // Check response status
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Deepgram API error ({}): {}", status, error_text));
    }

    // Parse JSON response
    let deepgram_response: DeepgramResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Extract transcript
    let transcript = deepgram_response
        .results
        .channels
        .get(0)
        .and_then(|channel| channel.alternatives.get(0))
        .map(|alt| alt.transcript.clone())
        .unwrap_or_default();

    Ok(transcript)
}

/// Simulate keyboard typing to insert text
#[tauri::command]
async fn type_text(text: String) -> Result<(), String> {
    // Small delay to ensure the previous window regains focus
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

    let mut enigo = Enigo::new();

    // Type each character
    for c in text.chars() {
        enigo.key_sequence(&c.to_string());
        // Small delay between characters for more natural typing
        tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
    }

    Ok(())
}

/// Get available audio input devices
#[tauri::command]
async fn get_audio_devices() -> Result<Vec<String>, String> {
    // This is a placeholder - actual implementation would enumerate audio devices
    // You might need additional dependencies like cpal for this
    Ok(vec!["Default Microphone".to_string()])
}

fn main() {
    // Create system tray
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show".to_string(), "Show"))
        .add_item(CustomMenuItem::new("hide".to_string(), "Hide"))
        .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let handle = app.handle();

            // Register global shortcut
            let shortcut_handle = handle.clone();
            app.global_shortcut_manager()
                .register("CmdOrCtrl+Alt+Space", move || {
                    // Emit event to frontend to toggle recording
                    shortcut_handle.emit_all("toggle-recording", ()).unwrap();
                })
                .map_err(|e| format!("Failed to register shortcut: {}", e))?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            transcribe_audio,
            type_text,
            get_audio_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}