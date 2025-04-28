import { useState } from "react";
import { getUploadPresignedUrl } from "@/services/servicesService";

export default function useImageUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Handle file selection
  const handleImageSelect = (file: File | null) => {
    console.log("Image selected:", file?.name || "none");
    setImageFile(file);

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("File preview generated");
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  // Upload image to S3 via presigned URL
  const uploadImageToS3 = async (): Promise<string | null> => {
    if (!imageFile) {
      console.log("No image file to upload");
      return null;
    }

    console.log("Starting image upload process for:", imageFile.name);
    setIsUploading(true);
    try {
      // Get presigned URL
      console.log("Requesting presigned URL for upload");
      const presignedData = await getUploadPresignedUrl(
        imageFile.name,
        imageFile.type
      );

      if (!presignedData) {
        console.error("Failed to get presigned URL");
        throw new Error("Failed to get upload URL");
      }

      console.log("Received presigned URL:", presignedData.presigned_url);
      console.log("Object key:", presignedData.object_key);

      // Upload file to S3
      console.log("Uploading file to S3...");
      const uploadResponse = await fetch(presignedData.presigned_url, {
        method: "PUT",
        body: imageFile,
        headers: {
          "Content-Type": imageFile.type,
        },
      });

      if (!uploadResponse.ok) {
        console.error("S3 upload failed with status:", uploadResponse.status);
        throw new Error("Failed to upload image");
      }

      // Construct the S3 URL (this is a standard S3 URL format)
      const s3BucketUrl =
        "https://cordex-service-images.s3.us-west-2.amazonaws.com";
      const finalUrl = `${s3BucketUrl}/${presignedData.object_key}`;
      console.log("Image uploaded successfully, URL:", finalUrl);
      setUploadedImageUrl(finalUrl);
      return finalUrl;
    } catch (error) {
      console.error("Image upload error:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    imageFile,
    imagePreview,
    isUploading,
    uploadedImageUrl,
    handleImageSelect,
    uploadImageToS3,
    setUploadedImageUrl,
  };
}
