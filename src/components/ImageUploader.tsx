import { useState, useRef, ChangeEvent } from "react";

interface ImageUploaderProps {
  onImageSelected: (file: File | null) => void;
  imagePreview: string | null;
}

export default function ImageUploader({
  onImageSelected,
  imagePreview,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    console.log("File selected:", file?.name || "none");
    onImageSelected(file);
  };

  return (
    <div>
      <label className="block text-sm mb-1">service image</label>
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 border border-gray-700 hover:border-white transition-colors"
        >
          {imagePreview ? "change image" : "select image"}
        </button>
        {imagePreview && (
          <div className="relative w-16 h-16 overflow-hidden">
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
