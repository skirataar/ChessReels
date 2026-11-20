import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Player Profile | DoomChess",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  redirect("/stats");
}
