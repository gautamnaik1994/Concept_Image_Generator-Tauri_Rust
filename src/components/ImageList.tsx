import { convertFileSrc } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";

type ImageListProps = {
  onImageSelect: (imagePath: string) => void;
  setFolderPath: (folderPath: string | null) => void;
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

export default function ImageList({ onImageSelect, setFolderPath }: ImageListProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageCountText = useMemo(() => {
    if (!selectedFolder) return "No folder selected";
    return `${images.length} image${images.length === 1 ? "" : "s"} found`;
  }, [images.length, selectedFolder]);

  async function handlePickFolder() {
    setError(null);

    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select an image folder",
    });

    if (!selected || Array.isArray(selected)) {
      return;
    }

    setSelectedFolder(selected);
    setFolderPath(selected);
    setIsLoading(true);

    try {
      const entries = (await readDir(selected)) as FsEntry[];

      const imagePaths = entries
        .filter((entry) => !entry.isDirectory && !!entry.name)
        .map((entry) => entry.name as string)
        .filter(isImageFile)
        .map((fileName) => joinPath(selected, fileName));

      setImages(imagePaths);
    } catch (readError) {
      setImages([]);
      const message =
        readError instanceof Error ? readError.message : "Could not read the selected folder.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

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

  return (
    <div className="image-browser">
      <div className="app-header">
        <h1>Image Folder Browser</h1>
        <p>Select any folder from your system and list image files inside it.</p>
      </div>
      <section className="folder-actions">
        <button type="button" onClick={handlePickFolder} disabled={isLoading}>
          {isLoading ? "Loading..." : "Choose Folder"}
        </button>

        <div className="folder-meta">
          <p className="folder-path">
            <strong>Selected folder:</strong> {selectedFolder ?? "No folder selected"}
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
