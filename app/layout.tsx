import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Room Todo - 团队打卡看板",
  description: "团队协同打卡与战报看板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700;800&family=Noto+Sans+SC:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-screen w-screen flex flex-col p-4 gap-4 text-main relative">
        {children}
      </body>
    </html>
  );
}
