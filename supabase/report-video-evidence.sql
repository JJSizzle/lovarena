-- Report-time video snapshot evidence (private bucket + abuse_reports columns)

alter table abuse_reports
  add column if not exists evidence_path text,
  add column if not exists ai_scan_result text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moderation-evidence',
  'moderation-evidence',
  false,
  1048576,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No client-facing storage policies — service role uploads via /api/report only.
