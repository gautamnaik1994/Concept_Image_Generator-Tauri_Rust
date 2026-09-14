import { convertFileSrc } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { message } from "@tauri-apps/plugin-dialog";

type WorkspaceProps = {
  selectedImages: string[];
  folderPath: string | null;
  onImageSelect: (imagePath: string) => void;
};

enum Model {
  MAI_IMAGE_2_6_FLASH = "MAI-Image-2.6-Flash",
  FLUX_1_KONTEXT_PRO = "flux_kontext_pro",
  FLUX_2_PRO = "flux_pro_2",
}

function Workspace({ selectedImages, folderPath, onImageSelect }: WorkspaceProps) {
  const [prompt, setPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [model, setModel] = useState<string>(Model.MAI_IMAGE_2_6_FLASH);
  const [seed, setSeed] = useState<number>(42);

  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number }>({
    width: 768,
    height: 768,
  });

  async function generateImage() {
    // check if folderPath is null
    if (!folderPath) {
      // alert("Please select a folder to save the generated image.");
      //  tauri notification to select a folder
      await message("Please select a folder to save the generated image.", {
        title: "Notification",
        kind: "error", // 'info', 'warning', or 'error'
      });

      return;
    }
    if (model === Model.MAI_IMAGE_2_6_FLASH) {
      await generateImageMAI();
    } else if (model === Model.FLUX_1_KONTEXT_PRO || model === Model.FLUX_2_PRO) {
      await generateImageFlux();
    } else {
      console.error("Unsupported model selected:", model);
    }
  }

  async function generateImageMAI() {
    setIsGenerating(true);
    try {
      const command = selectedImages.length > 0 ? "generate_image_edits" : "generate_image";
      const savedPath = await invoke(command, {
        prompt,
        ...(selectedImages.length > 0 && { referenceImages: selectedImages }),
        savePath: folderPath ?? "",
        width: imgDimensions.width,
        height: imgDimensions.height,
        model: model,
      });

      console.log("Image generation result:", savedPath);
      // setImgSrc(savedPath as string);
      setGeneratedImages((prev) => [...prev, savedPath as string]);
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateImageFlux() {
    setIsGenerating(true);
    try {
      const savedPath = await invoke("generate_image_flux", {
        prompt,
        savePath: folderPath ?? "",
        width: imgDimensions.width,
        height: imgDimensions.height,
        model: model,
        referenceImages: selectedImages,
        seed: seed,
        aspectRatio: "1:1",
      });

      console.log("Image generation result:", savedPath);
      setGeneratedImages((prev) => [...prev, savedPath as string]);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="workspace">
      <section className="chat-container">
        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div className="generated-images">
            <h3>Generated Images</h3>
            {generatedImages.map((imagePath) => (
              <div key={imagePath} className="generated-image">
                <img
                  src={convertFileSrc(imagePath)}
                  alt={imagePath}
                  onClick={() => onImageSelect(imagePath)}
                />
              </div>
            ))}
          </div>
        )}

        {/* {imgSrc && (
          <div className="generated-image">
            <h3>Generated Image</h3>

            <img
              src={convertFileSrc(imgSrc)}
              alt="Generated"
              onClick={() => onImageSelect(imgSrc as string)}
            />
          </div>
        )} */}

        {isGenerating && <p className="muted">Generating image...</p>}
      </section>

      <section className="chat-interface">
        <div>
          {selectedImages.length === 0 ? (
            <p className="muted">No images selected.</p>
          ) : (
            <div className="selected-images">
              {selectedImages.map((imagePath) => (
                <div key={imagePath} className="selected-image">
                  <img
                    src={convertFileSrc(imagePath)}
                    alt={imagePath}
                    onClick={() => onImageSelect(imagePath)}
                  />
                  {/* <p className="path-text">{imagePath}</p> */}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="params-selector">
          <div className="parameter">
            <label htmlFor="model-selector">Model Selector</label>
            <select id="model-selector" value={model} onChange={(e) => setModel(e.target.value)}>
              <option value={Model.MAI_IMAGE_2_6_FLASH}>MAI-Image-2.6-Flash</option>
              <option value={Model.FLUX_1_KONTEXT_PRO}>FLUX.1-Kontext-pro</option>
              <option value={Model.FLUX_2_PRO}>FLUX.2-pro</option>
            </select>
          </div>
          <div className="parameter">
            <label htmlFor="width">Width:</label>
            <input
              type="number"
              id="width"
              min="768"
              max="1024"
              value={imgDimensions.width}
              onChange={(e) => {
                setImgDimensions((prev) => ({ ...prev, width: parseInt(e.target.value, 10) }));
              }}
            />
          </div>
          <div className="parameter">
            <label htmlFor="height">Height:</label>
            <input
              type="number"
              id="height"
              min="768"
              max="1024"
              value={imgDimensions.height}
              onChange={(e) => {
                setImgDimensions((prev) => ({ ...prev, height: parseInt(e.target.value, 10) }));
              }}
            />
          </div>
          <div className="parameter">
            {/* seed */}
            <label htmlFor="seed">Seed:</label>
            <input
              type="number"
              id="seed"
              min="0"
              max="10000"
              value={seed}
              onChange={(e) => {
                setSeed(parseInt(e.target.value, 10));
              }}
            />
          </div>
        </div>
        <div className="input-container">
          <textarea
            className="prompt-input"
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            value={prompt}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                generateImage();
              }
            }}
          />
          <button className="generate-button" onClick={generateImage}>
            Generate
          </button>
        </div>
      </section>
    </div>
  );
}

export default Workspace;
