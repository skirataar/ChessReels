"use client";

import React, { useState } from "react";

export const AVATAR_PALETTE = [
  "#7c2d12",
  "#1e3a8a",
  "#065f46",
  "#581c87",
  "#831843",
  "#3730a3",
  "#115e59",
  "#9a3412",
];

export function getAvatarColor(identifier?: string | null): string {
  if (!identifier) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

export function getAvatarInitial(identifier?: string | null): string {
  if (!identifier) return "P";
  const clean = identifier.trim().replace(/^@/, "");
  return clean.length > 0 ? clean[0].toUpperCase() : "P";
}

export interface UserAvatarProps {
  avatar?: string | null;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  fallback?: string;
  className?: string;
  imgClassName?: string;
  shape?: "circle" | "rounded";
}

export function UserAvatar({
  avatar,
  username,
  name,
  email,
  fallback,
  className = "w-full h-full text-sm",
  imgClassName = "w-full h-full object-cover rounded-full",
  shape = "circle",
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Check if avatar is an obsolete AI preset or a pawn symbol
  const isPresetOrPawn =
    !avatar ||
    avatar === "♟" ||
    avatar === "P" ||
    avatar.includes("/avatars/grandmaster.jpg") ||
    avatar.includes("/avatars/knight.jpg") ||
    avatar.includes("/avatars/queen.jpg") ||
    avatar.includes("/avatars/cyber-king.jpg");

  const isCustomUrl =
    !isPresetOrPawn &&
    !hasError &&
    (avatar.startsWith("data:image/") ||
      avatar.startsWith("http://") ||
      avatar.startsWith("https://") ||
      (avatar.startsWith("/") && !avatar.startsWith("/avatars/")));

  if (isCustomUrl) {
    return (
      <img
        src={avatar!}
        alt={username || name || "Avatar"}
        className={imgClassName}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    );
  }

  // Use username, name, email, or fallback identifier
  const identifier = username || name || email || (fallback && fallback !== "♟" ? fallback : "Player");
  const initial = getAvatarInitial(identifier);
  const bgColor = getAvatarColor(identifier);
  const shapeClass = shape === "rounded" ? "rounded-xl" : "rounded-full";

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`${shapeClass} flex items-center justify-center font-bold text-[#f4f4f5] border border-[#c29b78]/30 select-none overflow-hidden shrink-0 ${className}`}
    >
      <span>{initial}</span>
    </div>
  );
}
