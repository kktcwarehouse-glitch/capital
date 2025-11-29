/*
  Enhancements for chat messaging (2025-11-26)

  - Adds attachment support to messages
  - Enables senders to edit or delete their own messages
*/

begin;

alter table messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text check (attachment_type in ('image', 'video', 'document')),
  add column if not exists attachment_metadata jsonb;

-- Relax content constraint to allow media-only messages (while keeping text limit)
alter table messages
  drop constraint if exists messages_content_check;

alter table messages
  add constraint messages_content_check
  check (
    (char_length(content) between 1 and 1000)
    or (attachment_url is not null and char_length(content) <= 1000)
  );

-- Allow senders to edit their own messages (e.g., content or attachment metadata)
drop policy if exists "Senders can update messages" on messages;
create policy "Senders can update messages"
  on messages for update
  to authenticated
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

-- Allow senders to delete their own messages
drop policy if exists "Senders can delete messages" on messages;
create policy "Senders can delete messages"
  on messages for delete
  to authenticated
  using (auth.uid() = sender_id);

commit;

