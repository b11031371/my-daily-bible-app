# 徽章圖示

徽章圖示由 `src/lib/badges/icons.ts` 以 badge id 對應到這裡的檔名，**不從資料庫讀取**
（`badges.icon` 欄位仍在，但已無人使用）。

## 目前使用的圖集

**[Twemoji](https://github.com/jdecked/twemoji)** — Twitter, Inc. 及貢獻者製作，採
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) 授權。完整授權文本見同目錄的
`LICENSE-GRAPHICS`。

選它的理由是**跨平台一致**：系統 emoji 的長相由裝置字型決定，iOS 與 Android 使用者
看到的並不相同；改用圖檔後所有人看到的都一樣。

### 授權要求

CC-BY 4.0 要求標示原始創作者。Twemoji 專案在 README 明示可接受的位置包含
「行動應用程式的設定／關於區塊」，故標示放在**設定頁底部**
（字串 `settings.creditsBadges` / `settings.creditsLicense`，三個語言檔都有）。

**移除或更換圖集時，記得一併處理該標示。** 圖檔本身未經修改，僅重新命名，
因此不需要標註「已修改」。

## 檔名對照

| 檔案 | 徽章 | 原 emoji |
|---|---|---|
| `first-step.svg` | 第一步 | 🌱 |
| `streak-3.svg` | 三日之火 | 🔥 |
| `streak-7.svg` | 一週挑戰 | ⚡ |
| `streak-30.svg` | 一月英雄 | 👑 |
| `voice.svg` | 發聲者 | ✍️ |
| `storyteller.svg` | 說故事的人 | 📖 |
| `century.svg` | 百點俱樂部 | 💯 |
| `faithful.svg` | 忠心的人 | 🕊️ |

## 要換掉某個徽章的圖

1. 新檔放進這個資料夾
2. 到 `src/lib/badges/icons.ts` 改對應的 `file`

把 `file` 拿掉則退回 emoji 顯示，所以可以一個一個換，中途不會破圖。
`BADGE_ICONS` 裡查不到的 badge id 會顯示 Phosphor 的 `Medal` 作為預設。

## 換圖時的規格

**尺寸**：實際顯示只有 **30px**（個人頁的徽章格、解鎖通知列皆是）。畫完務必縮到 30px
確認——細線條和小字在這個尺寸會直接消失。

**亮底與深底都要能看**：徽章不吃 `currentColor`、也不跟主題色走（收藏品不該因為使用者
換主題就變色），代價是可讀性得由圖檔自己顧。同一張圖要同時站在 `#FFFDF5`（亮）和
`#15120D`（深）上，所以不要用純白或純黑當主要輪廓，其中一邊會消失。

**未解鎖狀態**：`BadgeGrid` 會套 `grayscale` + 虛線框。避免「只靠顏色區分」的設計，
因為灰階後那個區分就沒了。
