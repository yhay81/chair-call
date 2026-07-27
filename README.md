# Chair Call

美容師・施術者が練習モデルの募集カードを作り、希望者が候補日時入りの応募文を端末内で組み立てる日本語Webアプリです。

## Stack

- Cloudflare Workers / D1 / Rate Limiting
- Hono / Hono JSX
- Vite+
- TypeScript

Better Authは、応募者情報とサーバー所有アカウントを持たず、掲載者が高エントロピーの管理URLを保管するため導入していません。

## Local development

```powershell
npm install
npm run dev
```

品質確認:

```powershell
npm run release:check
npm run check
npm test
npm run build
npm audit
```

## Data boundary

掲載者が公開するサロン名、広域エリア、最寄り駅、施術条件、候補日時、外部連絡URLを最大14日間表示します。正確な住所、電話番号、顔写真、応募者情報、決済、チャットは扱いません。
