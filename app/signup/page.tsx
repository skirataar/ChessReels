import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | DoomChess",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupPage() {
  redirect("/?auth=signup");
}
