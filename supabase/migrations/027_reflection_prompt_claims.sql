-- Each quota increment gets a claim id so a failed AI request can refund only
-- its own reservation, even when another tab claims a quota slot concurrently.
CREATE TABLE reflection_prompt_swap_claims (
  claim_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id, usage_date)
    REFERENCES reflection_prompt_usage(user_id, usage_date) ON DELETE CASCADE
);

ALTER TABLE reflection_prompt_swap_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION claim_reflection_prompt_swap(
  p_user_id UUID,
  p_usage_date TEXT,
  p_claim_id UUID
) RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_count SMALLINT;
BEGIN
  INSERT INTO reflection_prompt_usage (user_id, usage_date)
  VALUES (p_user_id, p_usage_date)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  UPDATE reflection_prompt_usage
  SET swap_count = swap_count + 1, updated_at = NOW()
  WHERE user_id = p_user_id
    AND usage_date = p_usage_date
    AND swap_count < 5
  RETURNING swap_count INTO claimed_count;

  IF claimed_count IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO reflection_prompt_swap_claims (claim_id, user_id, usage_date)
  VALUES (p_claim_id, p_user_id, p_usage_date);

  RETURN claimed_count;
END;
$$;

CREATE OR REPLACE FUNCTION refund_reflection_prompt_swap(p_claim_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_user UUID;
  claimed_date TEXT;
BEGIN
  DELETE FROM reflection_prompt_swap_claims
  WHERE claim_id = p_claim_id
  RETURNING user_id, usage_date INTO claimed_user, claimed_date;

  IF claimed_user IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE reflection_prompt_usage
  SET swap_count = GREATEST(0, swap_count - 1), updated_at = NOW()
  WHERE user_id = claimed_user AND usage_date = claimed_date;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION claim_reflection_prompt_swap(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION refund_reflection_prompt_swap(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_reflection_prompt_swap(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION refund_reflection_prompt_swap(UUID) TO service_role;
