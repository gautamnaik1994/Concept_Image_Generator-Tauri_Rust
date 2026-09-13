import { convertFileSrc } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

type WorkspaceProps = {
  selectedImages: string[];
  folderPath: string | null;
};

function Workspace({ selectedImages, folderPath }: WorkspaceProps) {
  const [prompt, setPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  async function generateImage() {
    setIsGenerating(true);
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    let savedPath = await invoke("generate_image", {
      prompt,
      referenceImages: selectedImages,
      savePath: folderPath ?? "",
    });
    setIsGenerating(false);

    console.log("Image generation result:", savedPath);
    setImgSrc(savedPath as string);
  }

  return (
    <div className="workspace">
      <h2>Workspace</h2>
      {selectedImages.length === 0 ? (
        <p className="muted">No images selected.</p>
      ) : (
        <div className="selected-images">
          {selectedImages.map((imagePath) => (
            <div key={imagePath} className="selected-image">
              {/* <img src={convertFileSrc(imagePath)} alt={imagePath} /> */}
              <p>{imagePath}</p>
            </div>
          ))}
        </div>
      )}

      {imgSrc && (
        <div className="generated-image">
          <h3>Generated Image</h3>
          <img src={convertFileSrc(imgSrc)} alt="Generated" />
        </div>
      )}

      {isGenerating && <p className="muted">Generating image...</p>}

      <h3>Prompt</h3>

      <textarea
        className="prompt-input"
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
        value={prompt}
      />
      <button className="generate-button" onClick={generateImage}>
        Generate
      </button>
    </div>
  );
}

export default Workspace;
