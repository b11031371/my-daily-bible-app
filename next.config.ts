import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 600,
    },
  },
  async headers() {
    return [
      {
        // public/ 底下的檔案 Next.js 預設是 max-age=0，等於瀏覽器每次要用都得回
        // 伺服器問一次「還是這張嗎」。PWA 從背景醒來時系統已經把解碼過的圖片丟掉，
        // 正好要重問——那一刻網路常常還沒接上，圖就空白了（且 <img> 不會自己重試）。
        // 快取設長之後醒來直接用本機那份，不必發請求，也就沒有失敗的機會。
        //
        // immutable 的代價：換圖後舊訪客最久會看到舊圖一年，所以換圖時務必同步
        // 提高 BADGE_ART_VERSION（見 lib/badges/icons.ts），網址一變就會重抓。
        source: '/badges/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
};

export default nextConfig;
