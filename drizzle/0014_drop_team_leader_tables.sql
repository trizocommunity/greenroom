-- Drop the legacy team_leader_* tables. The team-leader OTP/session flow
-- was replaced by the participant_otp / participant_session tables in
-- commit 9d41f9f ("feat(participant-login): chest-number + DOB/group login
-- for all participants"). This migration cleans up the now-unused legacy
-- tables; only the new participant_* tables remain.

DROP TABLE IF EXISTS "team_leader_otp";
DROP TABLE IF EXISTS "team_leader_session";
