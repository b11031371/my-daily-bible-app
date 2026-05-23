-- Migration 012: refund points when a reflection is deleted

CREATE OR REPLACE FUNCTION fn_refund_reflection_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.points_earned > 0 THEN
    UPDATE profiles
    SET total_points = GREATEST(0, total_points - OLD.points_earned)
    WHERE id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_refund_reflection_points
  AFTER DELETE ON reflections
  FOR EACH ROW EXECUTE FUNCTION fn_refund_reflection_points();
