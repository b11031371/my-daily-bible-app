-- Migration 009: Column and table comments

-- profiles
COMMENT ON TABLE profiles IS '使用者公開資料，對應 auth.users 一對一';
COMMENT ON COLUMN profiles.id IS '對應 auth.users.id，使用者唯一識別碼';
COMMENT ON COLUMN profiles.display_name IS '使用者顯示暱稱';
COMMENT ON COLUMN profiles.avatar_seed IS '頭像產生器的種子字串，相同 seed 產生相同頭像';
COMMENT ON COLUMN profiles.role IS '帳號角色：user（一般）或 admin（管理員）';
COMMENT ON COLUMN profiles.total_points IS '累計總積分';
COMMENT ON COLUMN profiles.streak_current IS '目前連續簽到天數';
COMMENT ON COLUMN profiles.streak_max IS '歷史最長連續簽到天數';
COMMENT ON COLUMN profiles.created_at IS '帳號建立時間';

-- checkins
COMMENT ON TABLE checkins IS '每日簽到紀錄，每位使用者每天只能有一筆';
COMMENT ON COLUMN checkins.id IS '簽到紀錄唯一識別碼';
COMMENT ON COLUMN checkins.user_id IS '簽到的使用者';
COMMENT ON COLUMN checkins.note_date IS '簽到對應的筆記日期（補簽時為過去日期）';
COMMENT ON COLUMN checkins.checked_in_at IS '實際執行簽到的時間';
COMMENT ON COLUMN checkins.is_retro IS '是否為補簽（true = 補簽，false = 當日簽到）';
COMMENT ON COLUMN checkins.days_late IS '補簽距今幾天，0 表示當日，最多 3 天';
COMMENT ON COLUMN checkins.points_earned IS '此次簽到獲得的積分';

-- reflections
COMMENT ON TABLE reflections IS '使用者對每日筆記的反思回答，每人每天一筆';
COMMENT ON COLUMN reflections.id IS '反思紀錄唯一識別碼';
COMMENT ON COLUMN reflections.user_id IS '撰寫反思的使用者';
COMMENT ON COLUMN reflections.note_date IS '對應的筆記日期';
COMMENT ON COLUMN reflections.content IS '反思內容，1–1000 字';
COMMENT ON COLUMN reflections.is_anonymous IS '是否匿名發布（true = 隱藏姓名）';
COMMENT ON COLUMN reflections.points_earned IS '此次反思獲得的積分';
COMMENT ON COLUMN reflections.bible_range IS '對應的讀經範圍（選填）';
COMMENT ON COLUMN reflections.created_at IS '首次建立時間';
COMMENT ON COLUMN reflections.updated_at IS '最後更新時間';

-- reflection_likes
COMMENT ON TABLE reflection_likes IS '反思留言的點讚紀錄，每人每則最多一個讚';
COMMENT ON COLUMN reflection_likes.id IS '點讚紀錄唯一識別碼';
COMMENT ON COLUMN reflection_likes.reflection_id IS '被點讚的反思';
COMMENT ON COLUMN reflection_likes.user_id IS '點讚的使用者';
COMMENT ON COLUMN reflection_likes.created_at IS '點讚時間';

-- badges
COMMENT ON TABLE badges IS '徽章定義表，由管理員維護';
COMMENT ON COLUMN badges.id IS '徽章唯一識別碼（slug 格式，如 streak_7）';
COMMENT ON COLUMN badges.name_zh IS '徽章中文名稱';
COMMENT ON COLUMN badges.description_zh IS '徽章解鎖條件說明';
COMMENT ON COLUMN badges.icon IS '徽章 emoji 圖示';
COMMENT ON COLUMN badges.condition_type IS '解鎖條件類型：streak / total_checkins / total_points / reflection_count';
COMMENT ON COLUMN badges.condition_value IS '解鎖條件門檻數值';
COMMENT ON COLUMN badges.points_bonus IS '解鎖時額外獎勵積分';
COMMENT ON COLUMN badges.is_active IS '是否啟用（false 表示暫時停用，不參與解鎖判斷）';

-- user_badges
COMMENT ON TABLE user_badges IS '使用者已解鎖的徽章';
COMMENT ON COLUMN user_badges.id IS '紀錄唯一識別碼';
COMMENT ON COLUMN user_badges.user_id IS '解鎖徽章的使用者';
COMMENT ON COLUMN user_badges.badge_id IS '對應的徽章';
COMMENT ON COLUMN user_badges.earned_at IS '解鎖時間';

-- leaderboard_snapshots
COMMENT ON TABLE leaderboard_snapshots IS '預先計算的排行榜快照，由排程定期寫入';
COMMENT ON COLUMN leaderboard_snapshots.id IS '快照紀錄唯一識別碼';
COMMENT ON COLUMN leaderboard_snapshots.period_type IS '排行榜週期：weekly 或 monthly';
COMMENT ON COLUMN leaderboard_snapshots.period_label IS '週期標籤，如 2026-W20 或 2026-05';
COMMENT ON COLUMN leaderboard_snapshots.user_id IS '排行榜中的使用者';
COMMENT ON COLUMN leaderboard_snapshots.points IS '該週期累計積分';
COMMENT ON COLUMN leaderboard_snapshots.checkin_count IS '該週期簽到次數';
COMMENT ON COLUMN leaderboard_snapshots.rank IS '該週期排名';

-- admin_log
COMMENT ON TABLE admin_log IS '管理員操作稽核記錄';
COMMENT ON COLUMN admin_log.id IS '稽核紀錄唯一識別碼';
COMMENT ON COLUMN admin_log.admin_id IS '執行操作的管理員';
COMMENT ON COLUMN admin_log.action_type IS '操作類型，如 manual_checkin、badge_edit 等';
COMMENT ON COLUMN admin_log.target_user IS '被操作的目標使用者（若有）';
COMMENT ON COLUMN admin_log.payload IS '操作詳細內容（JSON）';
COMMENT ON COLUMN admin_log.created_at IS '操作時間';

-- groups
COMMENT ON TABLE groups IS '種樹群組，成員共同累積積分讓樹成長';
COMMENT ON COLUMN groups.id IS '群組唯一識別碼';
COMMENT ON COLUMN groups.name IS '群組名稱（樹的名字）';
COMMENT ON COLUMN groups.invite_code IS '六位邀請碼，用於邀請新成員加入';
COMMENT ON COLUMN groups.fruit_order IS '聖靈果子的出現順序（隨機排列的 9 個果子名稱）';
COMMENT ON COLUMN groups.created_by IS '建立群組的使用者';
COMMENT ON COLUMN groups.created_at IS '群組建立時間';

-- group_members
COMMENT ON TABLE group_members IS '群組成員關係，記錄加入與離開時間';
COMMENT ON COLUMN group_members.id IS '成員紀錄唯一識別碼';
COMMENT ON COLUMN group_members.group_id IS '所屬群組';
COMMENT ON COLUMN group_members.user_id IS '成員使用者';
COMMENT ON COLUMN group_members.joined_at IS '加入群組的時間';
COMMENT ON COLUMN group_members.left_at IS '離開群組的時間，NULL 表示仍為現任成員';
COMMENT ON COLUMN group_members.role IS '成員角色：admin（建立者）或 member（一般成員）';
