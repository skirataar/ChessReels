export const CURATED_AVATARS = [
  { id: "grandmaster", name: "Grandmaster", url: "/avatars/grandmaster.jpg" },
  { id: "knight", name: "Obsidian Knight", url: "/avatars/knight.jpg" },
  { id: "queen", name: "Golden Queen", url: "/avatars/queen.jpg" },
  { id: "cyber-king", name: "Cyber King", url: "/avatars/cyber-king.jpg" },
];

/**
 * Compresses any user image file (from camera or gallery) into a high-performance,
 * 256x256 square-cropped JPEG data URL (~25KB) suitable for instant display and persistence.
 */
export async function compressImageFile(file: File, maxDim = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Selected file is not an image."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image."));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = maxDim;
          canvas.height = maxDim;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Canvas context unavailable."));
          }

          // Center-crop square logic
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxDim, maxDim);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Persists updated avatar into localStorage and synchronizes with PostgreSQL via PATCH /api/user/account
 */
export async function persistAvatar(avatarUrl: string, userId?: string | null): Promise<void> {
  try {
    if (typeof window === "undefined") return;

    // 1. Save guest custom DP
    window.localStorage.setItem("chess_reel_custom_dp", avatarUrl);

    // 2. Update saved account in localStorage
    const savedAccount = window.localStorage.getItem("chess_reel_account");
    if (savedAccount) {
      try {
        const parsed = JSON.parse(savedAccount);
        parsed.avatar = avatarUrl;
        window.localStorage.setItem("chess_reel_account", JSON.stringify(parsed));
      } catch {}
    }

    // 3. Dispatch global sync event
    window.dispatchEvent(new Event("account-updated"));

    // 4. If logged in, persist to database
    if (userId) {
      await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, avatar: avatarUrl }),
      }).catch((err) => {
        console.warn("Failed to persist avatar to database:", err);
      });
    }
  } catch (err) {
    console.warn("Could not persist avatar:", err);
  }
}
