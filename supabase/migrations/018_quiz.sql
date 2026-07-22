-- Migration 018: 即時搶答測驗（Kahoot 風）
--
-- 反作弊的核心是「正確答案不外流」：quiz_questions 只有擁有者讀得到，
-- 房間三張表（rooms / players / answers）開了 RLS 但刻意不建任何 policy，
-- 等於對 anon 與 authenticated 全關，只有 API route 的 service role 動得到。
-- 玩家看到的題目一律由 API 依房間狀態裁切後才送出。

-- ── 測驗本體（擁有者私有）────────────────────────────────────────────────────
CREATE TABLE quizzes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  bible_range      TEXT,
  source_note_date TEXT,
  origin           TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'ai')),
  language         TEXT NOT NULL DEFAULT 'zh',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX quizzes_owner_idx ON quizzes(owner_id, created_at DESC);

CREATE TABLE quiz_questions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id            UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  order_index        INTEGER NOT NULL,
  prompt             TEXT NOT NULL,
  options            JSONB NOT NULL,
  correct_index      INTEGER NOT NULL,
  explanation        TEXT,
  time_limit_seconds INTEGER NOT NULL DEFAULT 20 CHECK (time_limit_seconds BETWEEN 5 AND 120),
  -- 重新排序時會短暫出現重複的 order_index，延後到 commit 才檢查
  CONSTRAINT quiz_questions_order_unique UNIQUE (quiz_id, order_index) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT quiz_questions_options_len CHECK (jsonb_array_length(options) BETWEEN 2 AND 4),
  CONSTRAINT quiz_questions_correct_range CHECK (correct_index >= 0 AND correct_index < jsonb_array_length(options))
);

CREATE INDEX quiz_questions_quiz_idx ON quiz_questions(quiz_id, order_index);

-- ── 房間 ─────────────────────────────────────────────────────────────────────
CREATE TABLE quiz_rooms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id             UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  host_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pin                 TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'question', 'reveal', 'ended')),
  current_index       INTEGER NOT NULL DEFAULT -1,
  question_started_at TIMESTAMPTZ,
  allow_guests        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ
);

-- PIN 只在「還沒結束」的房間之間唯一，結束後可以回收再用
CREATE UNIQUE INDEX quiz_rooms_active_pin ON quiz_rooms(pin) WHERE status <> 'ended';

CREATE TABLE quiz_room_players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES quiz_rooms(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL = 訪客
  nickname      TEXT NOT NULL,
  avatar_seed   TEXT NOT NULL DEFAULT 'anon',
  token         TEXT NOT NULL,
  score         INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同一個帳號在同一間房只會有一列（重新整理就是回到原本的身分）
CREATE UNIQUE INDEX quiz_room_players_user_unique ON quiz_room_players(room_id, user_id) WHERE user_id IS NOT NULL;
-- 暱稱在房內唯一，免得現場分不出誰是誰
CREATE UNIQUE INDEX quiz_room_players_nickname_unique ON quiz_room_players(room_id, lower(nickname));
CREATE INDEX quiz_room_players_room_idx ON quiz_room_players(room_id, score DESC);

CREATE TABLE quiz_answers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES quiz_rooms(id) ON DELETE CASCADE,
  player_id      UUID NOT NULL REFERENCES quiz_room_players(id) ON DELETE CASCADE,
  -- 題目被擁有者改掉時不要連帶炸掉作答紀錄，靠 question_index 就夠對得起來
  question_id    UUID REFERENCES quiz_questions(id) ON DELETE SET NULL,
  question_index INTEGER NOT NULL,
  choice_index   INTEGER NOT NULL,
  is_correct     BOOLEAN NOT NULL,
  points         INTEGER NOT NULL,
  elapsed_ms     INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, player_id, question_index)
);

CREATE INDEX quiz_answers_room_question_idx ON quiz_answers(room_id, question_index);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own quizzes" ON quizzes
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "owner creates quizzes" ON quizzes
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner updates own quizzes" ON quizzes
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owner deletes own quizzes" ON quizzes
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- quiz_questions 帶著正確答案，只給擁有者。玩家永遠不直接讀這張表。
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages own questions" ON quiz_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_id AND q.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_id AND q.owner_id = auth.uid()));

-- 以下三張表沒有任何 policy = 對 anon / authenticated 全關，只有 service role 進得去
ALTER TABLE quiz_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- ── 作答（伺服器權威計時與計分）──────────────────────────────────────────────
-- 計分公式與 src/lib/quiz.ts 互為鏡像，改一邊記得改另一邊。
-- points = 1000 * (1 - 0.5 * elapsed / limit)，答對最慢也有 500 分，答錯 0 分。
CREATE OR REPLACE FUNCTION fn_submit_quiz_answer(
  p_pin            TEXT,
  p_player_id      UUID,
  p_token          TEXT,
  p_question_index INTEGER,
  p_choice_index   INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_room       quiz_rooms%ROWTYPE;
  v_player     quiz_room_players%ROWTYPE;
  v_question   quiz_questions%ROWTYPE;
  v_elapsed_ms INTEGER;
  v_limit_ms   INTEGER;
  v_correct    BOOLEAN;
  v_points     INTEGER;
BEGIN
  SELECT * INTO v_room FROM quiz_rooms WHERE pin = p_pin AND status <> 'ended';
  IF NOT FOUND THEN RAISE EXCEPTION 'room_not_found'; END IF;

  SELECT * INTO v_player FROM quiz_room_players
  WHERE id = p_player_id AND room_id = v_room.id AND token = p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_player'; END IF;

  IF v_room.status <> 'question' OR v_room.current_index <> p_question_index
     OR v_room.question_started_at IS NULL THEN
    RAISE EXCEPTION 'not_accepting';
  END IF;

  SELECT * INTO v_question FROM quiz_questions
  WHERE quiz_id = v_room.quiz_id AND order_index = p_question_index;
  IF NOT FOUND THEN RAISE EXCEPTION 'question_not_found'; END IF;

  IF p_choice_index < 0 OR p_choice_index >= jsonb_array_length(v_question.options) THEN
    RAISE EXCEPTION 'invalid_choice';
  END IF;

  v_limit_ms   := v_question.time_limit_seconds * 1000;
  v_elapsed_ms := GREATEST(0, (EXTRACT(EPOCH FROM (NOW() - v_room.question_started_at)) * 1000)::INTEGER);

  -- 多留 1 秒寬限給網路延遲，超過就完全不收
  IF v_elapsed_ms > v_limit_ms + 1000 THEN RAISE EXCEPTION 'too_late'; END IF;

  v_correct := p_choice_index = v_question.correct_index;
  v_points  := CASE WHEN v_correct
    THEN ROUND(1000 * (1 - 0.5 * LEAST(v_elapsed_ms::NUMERIC / v_limit_ms, 1)))::INTEGER
    ELSE 0 END;

  BEGIN
    INSERT INTO quiz_answers (
      room_id, player_id, question_id, question_index,
      choice_index, is_correct, points, elapsed_ms
    ) VALUES (
      v_room.id, v_player.id, v_question.id, p_question_index,
      p_choice_index, v_correct, v_points, v_elapsed_ms
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'already_answered';
  END;

  UPDATE quiz_room_players
  SET score         = score + v_points,
      correct_count = correct_count + CASE WHEN v_correct THEN 1 ELSE 0 END
  WHERE id = v_player.id;

  -- 刻意只回「收到了」：對錯要等主持人揭曉，否則有人會靠 API 回應偷看答案
  RETURN jsonb_build_object('accepted', true);
END;
$$;

-- 只給 service role 呼叫。函式預設對 PUBLIC 開放，先收回再單獨授權，
-- 免得有人拿 anon key 直接打這支 RPC 亂送答案。
REVOKE ALL ON FUNCTION fn_submit_quiz_answer(TEXT, UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION fn_submit_quiz_answer(TEXT, UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- ── 後台開關：是否開放一般用戶用 AI 出題（預設關閉，只有 admin 能用）────────
INSERT INTO app_settings (key, value) VALUES ('quiz_ai_open', 'false')
ON CONFLICT (key) DO NOTHING;
