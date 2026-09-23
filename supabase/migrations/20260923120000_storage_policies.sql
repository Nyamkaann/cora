-- Storage has its own row level security on storage.objects, separate from the
-- public/private flag on a bucket. Public only covers reads through the public
-- url; uploading still needs a policy, and without one every upload fails with
-- "new row violates row-level security policy".
--
-- Same rule as the rest of the MVP: authenticated does everything inside our
-- two buckets, anon writes nothing.

do $$
declare
  target text;
  buckets text[] := array['product-images', 'posters'];
begin
  foreach target in array buckets loop
    execute format(
      'drop policy if exists %I on storage.objects',
      'cora_' || replace(target, '-', '_') || '_read'
    );
    execute format(
      'drop policy if exists %I on storage.objects',
      'cora_' || replace(target, '-', '_') || '_write'
    );
    execute format(
      'drop policy if exists %I on storage.objects',
      'cora_' || replace(target, '-', '_') || '_update'
    );
    execute format(
      'drop policy if exists %I on storage.objects',
      'cora_' || replace(target, '-', '_') || '_delete'
    );

    execute format(
      'create policy %I on storage.objects for select to authenticated using (bucket_id = %L)',
      'cora_' || replace(target, '-', '_') || '_read', target
    );
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L)',
      'cora_' || replace(target, '-', '_') || '_write', target
    );
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id = %L) with check (bucket_id = %L)',
      'cora_' || replace(target, '-', '_') || '_update', target, target
    );
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L)',
      'cora_' || replace(target, '-', '_') || '_delete', target
    );
  end loop;
end;
$$;
