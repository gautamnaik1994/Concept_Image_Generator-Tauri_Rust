import ImageBrowser from "./components/ImageBrowser";
import Navbar from "./components/Navbar";
import Workspace from "./components/Workspace";
import "./styles/App.scss";
import { useState } from "react";

export default function App() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [folderPath, setFolderPath] = useState<string | null>(null);

  const handleImageSelect = (imagePath: string) => {
    setSelectedImages((prevSelectedImages) => {
      if (prevSelectedImages.includes(imagePath)) {
        return prevSelectedImages.filter((path) => path !== imagePath);
      } else {
        return [...prevSelectedImages, imagePath];
      }
    });
  };

  return (
    <main>
      <Navbar />
      <div className="container">
        <ImageBrowser
          onImageSelect={handleImageSelect}
          setFolderPath={setFolderPath}
          selectedImages={selectedImages}
        />
        <Workspace
          selectedImages={selectedImages}
          folderPath={folderPath}
          onImageSelect={handleImageSelect}
        />
      </div>
    </main>
  );
}
