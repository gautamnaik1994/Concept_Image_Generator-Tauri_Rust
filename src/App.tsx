import { load } from "@tauri-apps/plugin-store";
import { useState, useEffect } from "react";
import ImageBrowser from "./components/ImageBrowser";
import Navbar from "./components/Navbar";
import Workspace from "./components/Workspace";
import "./styles/App.scss";

export default function App() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(Date.now()); // Initialize with current timestamp

  const handleImageSelect = (imagePath: string) => {
    setSelectedImages((prevSelectedImages) => {
      if (prevSelectedImages.includes(imagePath)) {
        return prevSelectedImages.filter((path) => path !== imagePath);
      } else {
        return [...prevSelectedImages, imagePath];
      }
    });
  };

  useEffect(() => {
    const loadStore = async () => {
      const store = await load("store.json", { autoSave: false });
      try {
        const storedPath = await store.get<string>("savedFolderPath");
        if (storedPath) {
          console.log("Loaded saved folder path:", storedPath);
          setFolderPath(storedPath);
        }
      } catch (e) {
        console.warn("Saved path not found");
      }
    };

    loadStore();
  }, []);

  return (
    <main>
      <Navbar />
      <div className="container">
        <ImageBrowser
          onImageSelect={handleImageSelect}
          setFolderPath={setFolderPath}
          selectedImages={selectedImages}
          refreshSignal={refreshSignal}
          savedFolderPath={folderPath}
        />
        <Workspace
          selectedImages={selectedImages}
          folderPath={folderPath}
          onImageSelect={handleImageSelect}
          onRefreshSignalChange={setRefreshSignal}
        />
      </div>
    </main>
  );
}
