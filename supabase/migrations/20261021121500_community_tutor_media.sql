-- Preserve the complete Tutor explanation when it is shared to the community.
-- Existing community posts continue using image_url/image_path for uploaded images.
alter table public.community_posts
  add column if not exists tutor_image_url text,
  add column if not exists tutor_image_alt text,
  add column if not exists tutor_image_source_url text,
  add column if not exists tutor_image_license text,
  add column if not exists tutor_image_attribution text,
  add column if not exists tutor_visual_aid jsonb,
  add column if not exists tutor_video_url text,
  add column if not exists tutor_video_embed_url text,
  add column if not exists tutor_video_title text,
  add column if not exists tutor_video_description text,
  add column if not exists tutor_video_channel_name text,
  add column if not exists tutor_video_duration_label text,
  add column if not exists tutor_video_reason text;

comment on column public.community_posts.tutor_visual_aid is
  'Structured visual explanation shared from the Ensina-me Tutor (title, type, items and caption).';
comment on column public.community_posts.tutor_video_embed_url is
  'YouTube embed URL for the Tutor-recommended video; the client validates the host before rendering the player.';
