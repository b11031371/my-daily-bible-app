-- Migration 015: Badge i18n (multi-language names/descriptions via JSONB)
--
-- 加入 name_i18n / description_i18n（JSONB）多語欄位。新增語言只需往 JSON 塞 key，
-- 不必再 ALTER TABLE。App 讀取邏輯：name_i18n[locale] ?? name_i18n['zh'] ?? name_zh
-- （見 src/lib/i18n 的 localize()）。舊欄位 name_zh / description_zh 保留為基準與後備。

alter table badges
  add column if not exists name_i18n jsonb not null default '{}'::jsonb,
  add column if not exists description_i18n jsonb not null default '{}'::jsonb;

-- 為 004 種下的徽章補上 zh（沿用現有欄位）+ en 翻譯。
update badges set
  name_i18n        = jsonb_build_object('zh', name_zh,        'en', 'First Step'),
  description_i18n = jsonb_build_object('zh', description_zh, 'en', 'Complete your first check-in')
where id = 'first_step';

update badges set
  name_i18n        = jsonb_build_object('zh', name_zh,        'en', 'Three-Day Fire'),
  description_i18n = jsonb_build_object('zh', description_zh, 'en', 'Check in 3 days in a row')
where id = 'streak_3';

update badges set
  name_i18n        = jsonb_build_object('zh', name_zh,        'en', 'One-Week Challenge'),
  description_i18n = jsonb_build_object('zh', description_zh, 'en', 'Check in 7 days in a row')
where id = 'streak_7';

update badges set
  name_i18n        = jsonb_build_object('zh', name_zh,        'en', 'One-Month Hero'),
  description_i18n = jsonb_build_object('zh', description_zh, 'en', 'Check in 30 days in a row')
where id = 'streak_30';

update badges set
  name_i18n        = jsonb_build_object('zh', name_zh,        'en', 'Speaking Up'),
  description_i18n = jsonb_build_object('zh', description_zh, 'en', 'Answer your first reflection question')
where id = 'voice';

update badges set
  name_i18n        = jsonb_build_object('zh', name_zh,        'en', 'Storyteller'),
  description_i18n = jsonb_build_object('zh', description_zh, 'en', 'Answer 10 reflection questions')
where id = 'storyteller';

update badges set
  name_i18n        = jsonb_build_object('zh', name_zh,        'en', 'Century Club'),
  description_i18n = jsonb_build_object('zh', description_zh, 'en', 'Reach 100 total points')
where id = 'century';

update badges set
  name_i18n        = jsonb_build_object('zh', name_zh,        'en', 'Faithful One'),
  description_i18n = jsonb_build_object('zh', description_zh, 'en', 'Check in 20 times total')
where id = 'faithful';
