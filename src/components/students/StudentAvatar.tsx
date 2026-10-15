import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StudentAvatarProps {
  photoUrl?: string | null | undefined;
  fullName: string;
  className?: string | undefined;
  size?: "sm" | "md" | "lg" | "xl" | undefined;
}

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-lg",
};

/**
 * Deterministic color palette for student avatar fallbacks
 */
const BG_COLORS = [
  "bg-emerald-600 text-white",
  "bg-teal-600 text-white",
  "bg-sky-600 text-white",
  "bg-amber-600 text-white",
  "bg-indigo-600 text-white",
  "bg-rose-600 text-white",
  "bg-violet-600 text-white",
];

function getInitials(name: string): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0] ?? "S").substring(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || "S";
}

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % BG_COLORS.length;
}

export function StudentAvatar({ photoUrl, fullName, className, size = "md" }: StudentAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(fullName);
  const colorClass = BG_COLORS[getColorIndex(fullName)] ?? "bg-primary text-primary-foreground";

  return (
    <Avatar className={`${SIZE_CLASSES[size]} border border-border shadow-xs ${className ?? ""}`}>
      {photoUrl && !hasError ? (
        <AvatarImage
          src={photoUrl}
          alt={fullName}
          loading="lazy"
          onError={() => setHasError(true)}
          className="object-cover"
        />
      ) : null}
      <AvatarFallback className={`font-semibold tracking-wider ${colorClass}`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
