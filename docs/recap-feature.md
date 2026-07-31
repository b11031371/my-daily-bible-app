# 每月讀經回顧（Monthly Recap）

技術文件，記錄這個功能怎麼組出來的、踩過什麼坑、後台開關怎麼用。對應
commit：`db: note_meta 表` → `feat(recap): 資料層與資料庫 schema` →
`feat(recap): 手冊 UI、封面字型與簽到流程整合` → `feat(recap): 個人頁月曆
入口與開發測試按鈕` → `feat(recap): 後台開關`。

## 這是什麼

使用者每個月第一次簽到後，跳一個彈窗回顧「上個月」的讀經歷程：簽到日曆、
讀經作息人格、讀了幾章/幾卷書、寫了幾則反思、AI 幫忙整理的反思摘要、參與
種樹的成果。UI 做成一本翻頁的皮革書（封面上鎖、翻開才看得到內容），個人頁
留一個月曆圖示可以回頭翻任何一個月。

## 資料層

### 資料庫（`supabase/migrations/020`、`021`、`022`、`023`）

| 表 | 用途 |
|---|---|
| `recap_views` | 彈窗「已看過」紀錄。存 DB 不存 localStorage，換裝置/清瀏覽器資料不會重複跳。`(user_id, month)` 唯一鍵，`upsert ... ignoreDuplicates` 同時也是併發鎖。 |
| `note_meta` | 每日筆記的經文範圍快取。原始出處是 GitHub 上的 `note_zh.md`，回顧要秀「這天讀了什麼」，不該為此即時下載整份 markdown，所以落地成表，`/api/revalidate` 上傳筆記時用 `after()` 順手同步。 |
| `recap_summaries` | AI 書卷摘要快取。一人一月只算一次，之後重看直接讀快取。 |
| `app_settings` | 沿用既有的 key/value 設定表（`013_note_approvals.sql` 建的），新增 `recap_enabled` 這個 key 當總開關。 |

### 查詢主體：`src/lib/recap.ts`

`buildRecap(supabase, userId, month)` 一次組出 `MonthRecap`：簽到日曆、
讀經作息（`buildRhythm`，依 `checked_in_at` 的小時分桶，`RHYTHM_BUCKETS`
由早到晚，同票取較早的時段；完全沒簽到時 bucket 是 `'none'`，UI 顯示「忘記
簽到型讀經人」）、章數（`chaptersOf` 展開範圍字串成一組章識別碼，同一章分
兩天讀完靠 Set 去重）、書卷、徽章、種樹積分（`lib/recap-groups.ts`）。

**設計決定：統計頁四段一律顯示，包括全 0 的情況。** 早期版本是「沒資料就
不顯示那一段」，改成永遠顯示是為了讓完全沒簽到的月份也值得回頭看——「這個
月忘記簽到」本身也是一種值得被說出來的樣子，不是要藏起來的空白。連帶
`isEmpty` 這個欄位整個拿掉，`RecapContent` 不再有「完全空白就顯示一行文字」
的早退分支，永遠渲染整本書。

### AI 摘要：`src/app/api/recap/summary/route.ts` + `src/lib/ai.ts`

跟既有的反思搜尋（`api/ai/search-reflections`）共用重試邏輯，抽成
`lib/ai.ts` 的 `withRetry`（指數退避，只重試 429/503）。摘要用
`recap_summaries` 快取，永久保存（回顧是回頭看的快照，內容不會再變）。

沒寫反思時不會呼叫 AI，直接是 `empty` 狀態；有寫但 AI 判斷沒東西可整理是
另一種 `empty`（`failed` 才給重試按鈕——沒寫反思的人按重試永遠不會有結果）。
兩種 `empty` 文案不同：完全沒寫顯示「這個月並沒有寫下任何留言」+ 鼓勵去寫，
寫了但整理不出來顯示「這個月寫下的還不夠整理成一段」。

## UI：翻頁書（`src/components/recap/`）

### 翻頁物理（`RecapBook.tsx`）

同時只有兩層 DOM：底層是翻完之後看到的頁，上層是正在翻的那張紙
（`preserve-3d` + `backface-visibility: hidden` 的正反面卡片）。翻頁進度
用 JS 數值驅動（不是 CSS keyframes），因為拖到一半放開要能接著當下角度
跑完或彈回，keyframes 做不到這件事。

支援兩種輸入：
- **拖曳**：手指方向決定 `dir`（鎖定後不再變），位移換算成進度 `p`。
- **快速撥動**：放開時看瞬時速度（`FLICK_PX_MS = 0.5` px/ms），夠快就算數，
  不管實際拖了多遠——純看距離的話，短而快的撥動常常還沒到 `COMMIT_AT`
  就放開了，體感是「要滑很長一段才有反應」。

### 除錯記錄（都是這次一起修的既有 bug）

1. **反向拖曳會詭異地繼續前進**：進度計算原本用 `Math.abs(dx)`（離起點的
   直線距離，不分方向）。手指往回滑過起點想取消這次翻頁時，`|dx|` 會因為
   跑到另一側重新變大，進度沒有彈回反而繼續跑。改成照已鎖定的 `dir` 算
   有方向性的位移，超過起點就正確夾到 0。

2. **封面解鎖後，按下一頁鍵會翻兩次**：上鎖時掛在 `document` 的
   `pointerdown` 監聽器，480ms 後呼叫 `go(1)`；這個 `setTimeout` 的
   closure 抓住的是「上鎖那一刻」的 `go`，裡面凍結了當時 `busy=false`。
   如果使用者這 480ms 內手動按了「下一頁」，真正的翻頁動畫已經開始
   （`busy` 實際上是 `true`），但那個舊 closure 不知道，480ms 到了照樣
   又觸發一次 `go(1)`，兩次動畫疊在一起。修法：`useEffect` cleanup 時把
   這個 `setTimeout` 一併 `clearTimeout`。

3. **翻到封面/封底前一頁有殘影疊圖**：`RecapCover.tsx`（封面/封底）內部
   自己用 `z-10`/`z-20`/`z-30` 做層次（文字疊皮革、包角疊金框）。翻頁時
   「底層那頁」的包裹 `<div>` 沒有自己的堆疊環境（stacking context），
   當封面/封底是底層那頁時，它內部的正 z-index 會直接冒出去跟旁邊的
   `.recap-flipper`（沒設 z-index）搶順序，結果封底文字疊到翻動中的紙上
   面。一般內頁完全不用 z-index，所以只有封面/封底才會犯。修法：底層
   容器加 `isolate`。

4. **CSS 自我參照導致顏色失效**：`.recap-book` 想把 `--color-accent`
   往墨色混一點再用，寫成 `--color-accent: color-mix(in oklab,
   var(--color-accent) 70%, #52392A)`——右邊引用了正在被定義的同一個
   屬性，瀏覽器判定循環、整個屬性變成 invalid，日曆頁「寫了反思」那顆
   點的背景色跟著消失。修法：另開一個別名
   `--color-accent-src: var(--color-accent)`（在 `.recap-book` 範圍
   之外宣告，不會被自己覆寫），改去 mix 這個別名。

### 封面字型（`scripts/build-cover-fonts.py`）

封面/封底用自己託管的 Noto Serif TC（600）與 Cormorant Garamond（600），
不吃 `next/font/google`——這個環境冷啟動抓 Google 字型不穩，抓失敗會拖垮
整個編譯，而 dev 不會重試。文案固定，所以字集算得出來，裁切後兩支加起來
只有 20 KB，直接進 repo。

**踩過的坑**：字集計算原本用 `chars -= set('\\n{}')` 想把原始檔案裡的
`\n`（跳脫序列，兩個字元）跟插值符號濾掉，但這樣寫等於整組扣掉
`\`、`n`、`{`、`}` 這四個字元本身——連 June、January 這些單字裡真正的
字母 `n` 都被扣光，導致封面封底的字型完全沒有 `n` 這個字符。修法：先把
抓到的原始文字 `.replace('\\n', '\n')` 還原成真正的換行字元再收進字集。

## 個人頁入口與後台開關

### 入口：`RecapMonthMenu.tsx`

點開才列月份的抽屜選單，年份由新到舊。帳號存在期間的月份一律可點——
早期版本靠「有沒有簽到紀錄」決定能不能點，後來拿掉了：現在完全沒簽到的
月份也有內容可看（統計頁的「忘記簽到型讀經人」），不該再用簽到紀錄擋。

從彈窗的「前往個人頁查看每個月的回顧」連結進來時帶 `?recapTip=1`，月曆
圖示會圈出來、帶一張說明卡（`showTip` prop），點「我知道了」關掉並把網址
上的 `recapTip` 沖掉，不會重整又跳一次。

### 開發測試：`RecapDevTestButton.tsx`

只在 `NODE_ENV !== 'production'` 掛載。點一下用「上個月」資料強制打
`/api/recap/claim`（帶 `month` body，命中該 API 既有的開發逃生門），
跳過「已認領過」的節流，不必真的等到每月第一次簽到才能測彈窗。

### 後台總開關：`src/lib/recap-access.ts`

```ts
getRecapAccess(supabase, userId) → { canUseRecap, isAdmin }
```

跟既有的 `getQuizAccess`（`src/lib/quiz-access.ts`）同一套寫法。讀
`app_settings.recap_enabled`，找不到這筆設定就當作開啟（避免漏跑
migration 就讓整個既有功能悄悄消失）。**admin 永遠不受限**，關閉期間
還能自己檢查回顧內容對不對。

跟 `quiz_open` 預設 `'false'`（等正式開放才打開）相反，`recap_enabled`
預設 `'true'`——這支功能已經上線，關掉才是要主動做的例外操作。

三個地方一起擋，關閉時一般用戶是真的完全看不到，不是「進得去但看到空的」：

| 位置 | 行為 |
|---|---|
| `POST /api/recap/claim` | 關閉時直接回 `{ recap: null }`，簽到不跳彈窗。開發逃生門（`force` 模式，帶 `month` body）刻意跳過這關，本機測試不受線上開關影響。 |
| `/profile` | 月曆圖示整個不渲染（`{canUseRecap && <RecapMonthMenu .../>}`），不是渲染了但點了沒反應。 |
| `/recap/[month]` | 貼網址直接進來也會被 `redirect('/profile')`，防的是「知道網址規則就繞過入口」。 |

後台頁面（`/admin`）新增一顆「開放每月回顧」開關，跟既有的審核模式、搶答
測驗用同一套 pill switch UI（`src/app/admin/actions.ts` 的
`setRecapEnabled` server action，`revalidatePath` 刷新 `/profile`、
`/recap/[month]`、`/admin`）。

## 部署注意事項

新增的 4 支 migration（`020`～`023`）需要在 Supabase 手動套用（這個
repo 沒有連 Supabase CLI，套用方式跟既有 migration 一致，走 Dashboard 的
SQL Editor 或既有的部署腳本）。`023_recap_kill_switch.sql` 沒套用之前，
`recap_enabled` 這筆設定不存在，`getRecapAccess` 會照「找不到就當開啟」
的邏輯正常運作，不會因為漏套用而整個功能不能用；但後台那顆開關會顯示
「開啟中」卻按了沒反應（`update` 找不到那一列可更新），所以正式環境上線
前務必先套用 `023`。
