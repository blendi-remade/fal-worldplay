import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorldPlay - Generate Worlds, Create Characters, Step Inside",
  description:
    "Generate AI worlds with World Labs and playable 3D characters with Meshy. Then step inside and explore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
