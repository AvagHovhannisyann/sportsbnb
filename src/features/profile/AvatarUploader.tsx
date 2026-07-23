import React from "react";
import { Camera } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarUploaderProps {
  previewUrl: string | null;
  initials: string;
  onFileSelected: (file: File, previewDataUrl: string) => void;
}

/** Avatar with a camera badge that lets the user pick a new image (preview only — upload happens on save). */
const AvatarUploader = ({ previewUrl, initials, onFileSelected }: AvatarUploaderProps) => {
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFileSelected(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative">
      <Avatar className="h-24 w-24">
        <AvatarImage src={previewUrl || undefined} />
        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <Label
        htmlFor="avatar-upload"
        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
      >
        <Camera className="h-4 w-4" />
      </Label>
      <input
        id="avatar-upload"
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUploader;
