-- Messages written in Plenum itself. Its own migration: a new enum value cannot be used in the transaction that adds it.
alter type public.message_source add value if not exists 'app';
