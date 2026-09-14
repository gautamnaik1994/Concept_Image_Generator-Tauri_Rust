use reqwest::Client;
use tauri::State;

use base64::Engine;
use dotenvy_macro::dotenv;
use std::collections::HashMap;
use std::path::Path;

const FLUX_PRO_2: &str = "flux_pro_2";
const FLUX_KONTEXT_PRO: &str = "flux_kontext_pro";

const BASE_URL: &str = dotenv!("BASE_URL");
const API_KEY: &str = dotenv!("API_KEY");

#[derive(Debug, Clone, Copy)]
struct ModelConfig {
    model_name: &'static str,
    url_name: &'static str,
}

struct AppState {
    client: Client,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn generate_image(
    state: State<'_, AppState>,
    prompt: String,
    width: u32,
    height: u32,
    save_path: String,
    model: String,
) -> Result<String, String> {
    // let base_url = std::env::var("BASE_URL")
    //     .map_err(|_| "BASE_URL environment variable not set".to_string())?;
    // let api_key =
    //     std::env::var("API_KEY").map_err(|_| "API_KEY environment variable not set".to_string())?;

    let request_body = serde_json::json!({
        "prompt": prompt,
        "width": width,
        "height": height,
        "model": model
    });

    let client = &state.client;
    let response = client
        .post(format!("{}/mai/v1/images/generations", BASE_URL))
        .header("Content-Type", "application/json")
        .header("api-key", API_KEY)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Image generation API failed: {} - {}",
            status, body
        ));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let b64_image = response_json["data"][0]["b64_json"]
        .as_str()
        .ok_or_else(|| {
            format!(
                "Failed to extract b64_json from response: {}",
                response_json
            )
        })?;

    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_image)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or(std::time::Duration::from_secs(0))
        .as_millis();
    let output_path = Path::new(&save_path).join(format!("generated_image_{}.png", timestamp));
    std::fs::write(&output_path, image_bytes)
        .map_err(|e| format!("Failed to write image file: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn generate_image_edits(
    state: State<'_, AppState>,
    prompt: String,
    reference_images: Vec<String>,
    width: u32,
    height: u32,
    save_path: String,
    model: String,
) -> Result<String, String> {
    // let base_url = std::env::var("BASE_URL")
    //     .map_err(|_| "BASE_URL environment variable not set".to_string())?;
    // let api_key =
    //     std::env::var("API_KEY").map_err(|_| "API_KEY environment variable not set".to_string())?;

    if reference_images.is_empty() {
        return Err("At least one reference image is required".to_string());
    }

    let mut form = reqwest::multipart::Form::new()
        .text("prompt", prompt)
        .text("width", width.to_string())
        .text("height", height.to_string())
        .text("model", model);

    for image_path in reference_images {
        let path = Path::new(&image_path);
        let image_type = match path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_ascii_lowercase())
            .as_deref()
        {
            Some("png") => "image/png",
            Some("jpg" | "jpeg") => "image/jpeg",
            Some(extension) => {
                return Err(format!(
                    "Unsupported reference image type '.{}'; use PNG or JPEG",
                    extension
                ));
            }
            None => {
                return Err(format!(
                    "Reference image has no file extension: {}",
                    image_path
                ))
            }
        };

        let image_bytes = std::fs::read(path)
            .map_err(|e| format!("Failed to read reference image '{}': {}", image_path, e))?;
        let file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| format!("Invalid reference image path: {}", image_path))?;
        let part = reqwest::multipart::Part::bytes(image_bytes)
            .file_name(file_name.to_string())
            .mime_str(image_type)
            .map_err(|e| format!("Failed to set reference image MIME type: {}", e))?;
        form = form.part("image", part);
    }

    let client = &state.client;
    let response = client
        .post(format!("{}/mai/v1/images/edits", BASE_URL))
        .header("api-key", API_KEY)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Image generation API failed: {} - {}",
            status, body
        ));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let b64_image = response_json["data"][0]["b64_json"]
        .as_str()
        .ok_or_else(|| {
            format!(
                "Failed to extract b64_json from response: {}",
                response_json
            )
        })?;

    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_image)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    // append timestamp to the filename to avoid overwriting previous images using std::time::SystemTime
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or(std::time::Duration::from_secs(0))
        .as_millis();
    let output_path = Path::new(&save_path).join(format!("generated_image_{}.png", timestamp));
    std::fs::write(&output_path, image_bytes)
        .map_err(|e| format!("Failed to write image file: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}

fn build_config() -> HashMap<&'static str, ModelConfig> {
    HashMap::from([
        (
            FLUX_PRO_2,
            ModelConfig {
                model_name: "FLUX.2-pro",
                url_name: "flux-2-pro",
            },
        ),
        (
            FLUX_KONTEXT_PRO,
            ModelConfig {
                model_name: "FLUX.1-Kontext-pro",
                url_name: "flux-kontext-pro",
            },
        ),
    ])
}

// function to create base64 encoded string from image file path
fn image_to_base64(image_path: &str) -> Result<String, String> {
    let image_bytes = std::fs::read(image_path)
        .map_err(|e| format!("Failed to read image file '{}': {}", image_path, e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&image_bytes))
}

use serde_json::{json, Map, Value};

fn payload_builder(
    model: &str,
    prompt: &str,
    size: (u32, u32),
    aspect_ratio: &str,
    reference_images: Option<Vec<String>>,
    seed: u64,
) -> Result<Value, String> {
    let config = build_config();
    let config_data = config.get(model).ok_or_else(|| {
        format!(
            "Model '{}' is not supported. Supported models are: {:?}",
            model,
            [FLUX_PRO_2, FLUX_KONTEXT_PRO]
        )
    })?;

    // Convert image file paths to base64
    let encoded_images: Vec<String> = reference_images
        .unwrap_or_default()
        .iter()
        .map(|img| image_to_base64(img))
        .collect::<Result<Vec<_>, _>>()?;

    let mut payload = Map::new();

    match model {
        FLUX_PRO_2 => {
            let max_images = 8;
            if encoded_images.len() > max_images {
                return Err(format!(
                    "Model '{}' supports a maximum of {} reference images.",
                    model, max_images
                ));
            }

            payload.insert("model".to_string(), json!(config_data.model_name));
            payload.insert("prompt".to_string(), json!(prompt));
            payload.insert("seed".to_string(), json!(seed));
            payload.insert("width".to_string(), json!(size.0));
            payload.insert("height".to_string(), json!(size.1));
            payload.insert("output_format".to_string(), json!("png"));
        }
        FLUX_KONTEXT_PRO => {
            let max_images = 4;
            if encoded_images.len() > max_images {
                return Err(format!(
                    "Model '{}' supports a maximum of {} reference images.",
                    model, max_images
                ));
            }

            payload.insert("model".to_string(), json!(config_data.model_name));
            payload.insert("prompt".to_string(), json!(prompt));
            payload.insert("seed".to_string(), json!(seed));
            payload.insert("aspect_ratio".to_string(), json!(aspect_ratio));
            payload.insert("output_format".to_string(), json!("png"));
        }
        _ => unreachable!("Handled by config lookup + constants"),
    }

    // Dynamically set input_image, input_image_2, ... input_image_N
    for (idx, img_b64) in encoded_images.iter().enumerate() {
        let key = if idx == 0 {
            "input_image".to_string()
        } else {
            format!("input_image_{}", idx + 1)
        };
        payload.insert(key, json!(img_b64));
    }

    Ok(Value::Object(payload))
}

// fn main() {
//     let config = build_config();

//     let model_key = "flex_pro_2";
//     if let Some(entry) = config.get(model_key) {
//         println!("model_name = {}", entry.model_name);
//         println!("url_name = {}", entry.url_name);
//     }
// }

#[tauri::command]
async fn generate_image_flux(
    state: State<'_, AppState>,
    prompt: String,
    width: u32,
    height: u32,
    aspect_ratio: String,
    reference_images: Option<Vec<String>>,
    seed: u64,
    save_path: String,
    model: String,
) -> Result<String, String> {
    // let base_url = std::env::var("BASE_URL")
    //     .map_err(|_| "BASE_URL environment variable not set".to_string())?;
    // let api_key =
    //     std::env::var("API_KEY").map_err(|_| "API_KEY environment variable not set".to_string())?;

    let payload = payload_builder(
        &model,
        &prompt,
        (width, height),
        &aspect_ratio,
        reference_images,
        seed,
    )?;
    let config = build_config();

    let url_name = config
        .get(model.as_str())
        .map(|entry| entry.url_name)
        .ok_or_else(|| format!("Unsupported model: {}", model))?;

    let endpoint = format!(
        "/providers/blackforestlabs/v1/{}?api-version=preview",
        url_name
    );

    let client = &state.client;
    let response = client
        .post(format!("{}{}", BASE_URL, endpoint))
        .header("Content-Type", "application/json")
        .header("api-key", API_KEY)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Image generation API failed: {} - {}",
            status, body
        ));
    }

    let response_json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let b64_image = response_json["data"][0]["b64_json"]
        .as_str()
        .ok_or_else(|| {
            format!(
                "Failed to extract b64_json from response: {}",
                response_json
            )
        })?;

    let image_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_image)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or(std::time::Duration::from_secs(0))
        .as_millis();
    let output_path = Path::new(&save_path).join(format!("generated_image_{}.png", timestamp));
    std::fs::write(&output_path, image_bytes)
        .map_err(|e| format!("Failed to write image file: {}", e))?;

    Ok(output_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // dotenv::dotenv().ok();
    tauri::Builder::default()
        .manage(AppState {
            client: Client::new(),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            generate_image,
            generate_image_edits,
            generate_image_flux
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
