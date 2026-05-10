-- Allow public read on checkins for community features (today's checkin count, community preview)
DROP POLICY "checkins_select_own" ON checkins;
CREATE POLICY "checkins_select_all" ON checkins FOR SELECT USING (true);
