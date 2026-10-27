-- The Teams channel a project reads from, pasted by a project manager as a channel link. Managers already edit projects (policy "managers edit projects").
alter table public.projects add column teams_team_id text, add column teams_channel_id text;
