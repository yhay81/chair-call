import type { Child } from "hono/jsx";
import { PRODUCT } from "../config/product";

type LayoutProps = {
  children: Child;
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  appScript?: boolean;
  page?: string;
};

export function Brand() {
  return (
    <a class="brand" href="/" aria-label="Chair Call ホーム">
      <span class="brand-mark" aria-hidden="true">
        <span></span>
      </span>
      <h1>{PRODUCT.name}</h1>
    </a>
  );
}

export function Header() {
  return (
    <header class="topbar shell">
      <Brand />
      <nav class="topnav" aria-label="メイン">
        <a class="nav-create" href="/create">
          募集をつくる
        </a>
        <a href="/guide">使い方</a>
        <a href="/privacy">プライバシー</a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer class="site-footer shell">
      <span>
        Modeca・minimo・各SNS・各サロンの公式サービスではありません。掲載条件は連絡先で確認してください。
      </span>
      <nav aria-label="フッター">
        <a href="/guide">使い方</a>
        <a href="/privacy">プライバシー</a>
        <a href={PRODUCT.repository}>ソースコード</a>
      </nav>
    </footer>
  );
}

export function Layout({
  children,
  title = PRODUCT.name,
  description = PRODUCT.description,
  path = "/",
  noIndex = false,
  appScript = false,
  page = "",
}: LayoutProps) {
  const canonical = `${PRODUCT.origin}${path}`;
  const fullTitle = title === PRODUCT.name ? title : `${title} | ${PRODUCT.name}`;

  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        {noIndex ? <meta name="robots" content="noindex" /> : null}
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={PRODUCT.name} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${PRODUCT.origin}/og.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#283233" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="stylesheet" href="/app.css" />
        {appScript ? <script src="/app.js" defer></script> : null}
      </head>
      <body data-page={page}>{children}</body>
    </html>
  );
}
