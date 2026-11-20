import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quality Assurance Testing | DoomChess",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TempQaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
