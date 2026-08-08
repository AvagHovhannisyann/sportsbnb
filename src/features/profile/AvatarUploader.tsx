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
    <div className="relative w-fit shrink-0 self-start">
      <Avatar className="h-20 w-20 border border-border bg-card shadow-xs sm:h-24 sm:w-24">
        <AvatarImage src={previewUrl || undefined} alt="Profile photo" />
        <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <Label
        htmlFor="avatar-upload"
        aria-label="Choose a new profile photo"
        className="focus-within:ring-ring absolute -bottom-1 -right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-colors duration-150 hover:bg-primary/90 focus-within:ring-2 focus-within:ring-offset-2 motion-reduce:transition-none"
      >
        <Camera className="h-4 w-4" aria-hidden="true" />
      </Label>
      <input
        id="avatar-upload"
        type="file"
        accept="image/*"
        aria-label="Profile photo"
        onChange={handleAvatarChange}
        className="sr-only"
      />
    </div>
  );
};

export default AvatarUploader;
