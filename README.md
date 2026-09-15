# Concept Image Generator

![Logo][./public/logo.svg]

Concept Image Generator is a desktop app built with Tauri, React, and Rust for generating images from text prompts, with optional reference-image editing workflows.
The goal was to create a app similar to MidJourney or DALL-E, but with a local folder-based workflow and a more flexible model backend.
I really liked the way Midjourney using previous images as references, so I wanted to implement a similar feature in this app.

The frontend provides:

- Folder selection and local image browsing
- Multi-image selection as references
- Prompt input and generation controls
- Generated image preview and quick re-selection

The backend provides:

- HTTP integration with MAI image generation endpoints
- HTTP integration with FLUX model endpoints
- Base64 decoding/encoding and file output

## Tech Stack

- Tauri 2
- Rust (backend command handlers)
- React 19 + TypeScript + Vite 8 (frontend)

**Why Tauri?** Although I have experience with JavaScript/TypeScript which Electron uses, I wanted to try Tauri for its smaller bundle size and Rust integration. Tauri allows me to write backend logic in Rust while keeping the frontend in React.
The biggest advantage of Tauri is the final bundle size. For example, a simple "Hello World" Tauri app is only 3.5MB, while the same app in Electron is 50MB. This is because Tauri uses the system's webview instead of bundling Chromium.
Also I wanted to add a Rust based app to my portfolio, and Tauri App is a great way to do that.

## How It Works

1. Choose a local folder in the Image Browser.
2. The app reads image files from that folder and shows thumbnails.
3. Select zero or more images as references.
4. Enter a prompt and model settings in Workspace.
5. Click Generate (or press Enter in the prompt input).
6. Frontend calls Rust commands via Tauri `invoke`.
7. Rust calls remote model APIs, decodes response images, and saves them in the selected folder.
8. Saved image paths are returned and displayed in the UI.

## Supported Image Generation Models

- `MAI-Image-2.6-Flash` : Good for fast general image generation, supports text-to-image and image-editing workflows.
- `FLUX.1-Kontext-pro`: Good for editing images
- `FLUX.2-pro` : Good for generating images from text prompts, supports multi-image reference workflows.

## Prerequisites

Install the following before running the app:

- Node.js (LTS recommended)
- pnpm
- Rust toolchain (`rustup`, `cargo`)
- Tauri system dependencies for your OS

For macOS, ensure Xcode Command Line Tools are installed.

## Environment Variables

The Rust backend reads compile-time environment variables using `dotenvy_macro::dotenv!`:

- `BASE_URL`
- `API_KEY`

Create a `.env` in the root folder:

```env
BASE_URL=https://your-api-host
API_KEY=your-api-key
```

## Installation

From project root:

```bash
pnpm install
```

## Development

Run the desktop app in development mode:

```bash
pnpm tauri dev
```

Useful scripts:

- `pnpm dev` - Run only the Vite frontend dev server
- `pnpm build` - Type-check and build frontend assets
- `pnpm tauri dev` - Run full Tauri app in dev mode
- `pnpm tauri build` - Build production desktop bundles

## Build

Create production bundles:

```bash
pnpm tauri build
```

Output artifacts are produced under `src-tauri/target/release/`.

## Notes and Known Constraints

- Folder browser currently reads top-level files only (non-recursive).
- UI width/height inputs are constrained between 64 (768 for MAI model) and 1024 pixels.
- FLUX request payload limits are enforced in Rust:
  - `flux_pro_2`: up to 8 reference images
  - `flux_kontext_pro`: up to 4 reference images
- Generated files are saved as `generated_image_<timestamp>.png`.
