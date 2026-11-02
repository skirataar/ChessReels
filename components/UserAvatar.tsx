"use client";

import React, { useState } from "react";

interface UserAvatarProps {
  avatar?: string | null;
  fallback?: string;
  className?: string;
  imgClassName?: string;
}

export function UserAvatar({
  avatar,
  fallback = "♟",
  className = "w-full h-full flex items-center justify-center text-sm",
  imgClassName = "w-full h-full object-cover rounded-full",
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const isUrl =
    Boolean(avatar) &&
    !hasError &&
    (avatar!.startsWith("http://") ||
      avatar!.startsWith("https://") ||
      avatar!.startsWith("/") ||
      avatar!.startsWith("data:image/"));

  if (isUrl) {
    return (
      <img
        src={avatar!}
        alt="Avatar"
        className={imgClassName}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    );
  }

  // Safe fallback if avatar is a long string or empty
  const displayEmoji =
    avatar && !hasError && avatar.length <= 4 ? avatar : fallback;

  return <span className={className}>{displayEmoji}</span>;
}
