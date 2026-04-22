import { Head, Html, Main, NextScript } from "next/document";

export default function LegacyDocument() {
  return (
    <Html lang="zh-CN">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700;800&family=Noto+Sans+SC:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="relative flex h-screen w-screen flex-col gap-4 p-4 text-main">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
