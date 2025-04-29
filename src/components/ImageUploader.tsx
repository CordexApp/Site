import { useState, useRef, ChangeEvent } from "react";
import { InputLabel } from "./ui/InputLabel";

interface ImageUploaderProps {
  onImageSelected: (file: File | null) => void;
  imagePreview: string | null;
  label?: string;
}

export default function ImageUploader({
  onImageSelected,
  imagePreview,
  label = "service image",
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    console.log("File selected:", file?.name || "none");
    onImageSelected(file);
  };

  return (
    <div>
      <InputLabel>{label}</InputLabel>
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 text-gray-700 hover:text-white focus:text-white active:text-white transition-colors"
        >
          [ {imagePreview ? "change image" : "select image"} ]
        </button>
        {imagePreview && (
          <div className="relative w-16 h-16 overflow-hidden border border-white">
            <img
              src={imagePreview}
              alt="Preview"
              className="object-cover w-full h-full"
            />
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}
