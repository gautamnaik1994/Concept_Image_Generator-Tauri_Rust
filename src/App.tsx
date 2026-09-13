import ImageList from "./components/ImageList";
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
        <ImageList onImageSelect={handleImageSelect} setFolderPath={setFolderPath} />
        <Workspace selectedImages={selectedImages} folderPath={folderPath} />
      </div>
    </main>
  );
}
