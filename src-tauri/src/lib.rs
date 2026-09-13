// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}


use std::path::Path;
use base64::Engine;

#[tauri::command]
async fn generate_image(prompt: String, save_path: String) -> Result<String, String> {


    dotenv::dotenv().ok();
    let base_url = std::env::var("BASE_URL")
        .map_err(|_| "BASE_URL environment variable not set".to_string())?;
    let api_key = std::env::var("API_KEY")
        .map_err(|_| "API_KEY environment variable not set".to_string())?;

    let request_body = serde_json::json!({
        "prompt": prompt,
        "width": 1024,
        "height": 1024,
        "model": "MAI-Image-2.6-Flash"
    });

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/mai/v1/images/generations", base_url))
        .header("Content-Type", "application/json")
        .header("api-key", api_key)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Image generation API failed: {} - {}", status, body));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let b64_image = response_json["data"][0]["b64_json"]
        .as_str()
        .ok_or_else(|| format!("Failed to extract b64_json from response: {}", response_json))?;

    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_image)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    let output_path = Path::new(&save_path).join("generated_image.png");
    std::fs::write(&output_path, image_bytes)
        .map_err(|e| format!("Failed to write image file: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}




#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, generate_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
