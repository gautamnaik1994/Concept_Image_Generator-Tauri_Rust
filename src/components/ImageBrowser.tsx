import { convertFileSrc } from "@tauri-apps/api/core";
import { useMemo, useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";

type ImageListProps = {
  onImageSelect: (imagePath: string) => void;
  setFolderPath: (folderPath: string | null) => void;
  selectedImages?: string[];
  refreshSignal?: number; // parent increments to trigger refresh
  onSelectedImagesChange?: (paths: string[]) => void;
  savedFolderPath?: string | null;
};

type FsEntry = {
  name?: string;
  isDirectory?: boolean;
  children?: FsEntry[];
};

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tiff",
  ".svg",
]);

function isImageFile(fileName: string): boolean {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = fileName.slice(dotIndex).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function joinPath(folder: string, fileName: string): string {
  const separator = folder.includes("\\") ? "\\" : "/";

  if (folder.endsWith("/") || folder.endsWith("\\")) {
    return `${folder}${fileName}`;
  }
  return `${folder}${separator}${fileName}`;
}

function getFileName(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}

export default function ImageBrowser({
  onImageSelect,
  setFolderPath,
  selectedImages,
  refreshSignal,
  onSelectedImagesChange,
  savedFolderPath,
}: ImageListProps) {
  // const store = await load("store.json", { autoSave: false });

  console.log("ImageBrowser props:", {
    selectedImages,
    refreshSignal,
    savedFolderPath,
  });

  // const [selectedFolder, setSelectedFolder] = useState<string | null>(savedFolderPath ?? null);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageCountText = useMemo(() => {
    if (!savedFolderPath) return "No folder selected";
    return `${images.length} image${images.length === 1 ? "" : "s"} found`;
  }, [images.length, savedFolderPath]);

  async function loadImagesFromFolder(folder: string) {
    setError(null);
    setIsLoading(true);

    try {
      const entries = (await readDir(folder)) as FsEntry[];

      const imagePaths = entries
        .filter((entry) => !entry.isDirectory && !!entry.name)
        .map((entry) => entry.name as string)
        .filter(isImageFile)
        .map((fileName) => joinPath(folder, fileName));

      setImages(imagePaths);

      // Keep only selected items that still exist after refresh
      if (selectedImages && onSelectedImagesChange) {
        const nextSelected = selectedImages.filter((p) => imagePaths.includes(p));
        if (nextSelected.length !== selectedImages.length) {
          onSelectedImagesChange(nextSelected);
        }
      }
    } catch (readError) {
      setImages([]);
      const message =
        readError instanceof Error ? readError.message : "Could not read the selected folder.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePickFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select an image folder",
    });

    if (!selected || Array.isArray(selected)) return;

    // setSelectedFolder(selected);
    setFolderPath(selected);
    const store = await load("store.json", { autoSave: false });
    await store.set("savedFolderPath", selected);
    await store.save();
    console.log("Saved folder path to store:", selected);
    await loadImagesFromFolder(selected);
  }

  // useEffect(() => {
  //   if (savedFolderPath) {
  //     console.log("Using saved folder path from props:", savedFolderPath);
  //     // setSelectedFolder(savedFolderPath);
  //     void loadImagesFromFolder(savedFolderPath);
  //   }
  // }, []);

  useEffect(() => {
    console.log("refreshSignal or selectedFolder changed:", { refreshSignal, savedFolderPath });
    if (!savedFolderPath) return;
    void loadImagesFromFolder(savedFolderPath);
  }, [refreshSignal, savedFolderPath]);

  // if (!selectedFolder) {
  //   return (
  //     <section className="image-list-section">
  //       <h2>Images</h2>
  //       <p className="muted">Choose a folder to view images.</p>
  //     </section>
  //   );
  // }

  // if (images.length === 0) {
  //   return (
  //     <section className="image-list-section">
  //       <h2>Images</h2>
  //       <p className="muted">No images found in this folder.</p>
  //     </section>
  //   );
  // }

  console.log("Rendering ImageBrowser with state:", {
    savedFolderPath,
    images,
    isLoading,
    error,
  });

  return (
    <div className="image-browser">
      <h2>Image Browser</h2>
      <section className="folder-actions">
        <button type="button" onClick={handlePickFolder} disabled={isLoading}>
          {isLoading ? "Loading..." : "Choose Folder"}
        </button>

        <div className="folder-meta">
          <p className="folder-path">
            <strong>Selected folder:</strong> {savedFolderPath ?? "No folder selected"}
          </p>
          <p className="image-summary">{imageCountText}</p>
        </div>
      </section>

      {error ? <p className="error-text">Error: {error}</p> : null}

      <section className="image-list-section">
        <div className="image-list-header">
          <h2>Images</h2>
          <span className="image-count">{images.length}</span>
        </div>

        <div className="image-grid" role="list">
          {images.map((imagePath) => {
            return (
              <div key={imagePath} className="image-grid-item">
                <input
                  id={imagePath}
                  type="checkbox"
                  name="selected-image"
                  value={imagePath}
                  aria-label={getFileName(imagePath)}
                  checked={selectedImages?.includes(imagePath) || false}
                  onChange={() => {
                    onImageSelect(imagePath);
                  }}
                />
                <label htmlFor={imagePath} className="image-label">
                  <img
                    src={convertFileSrc(imagePath)}
                    alt={getFileName(imagePath)}
                    className="image-thumbnail"
                    width={150}
                    height={150}
                    loading="lazy"
                  />
                  {/* <span className="image-name">{getFileName(imagePath)}</span> */}
                </label>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
