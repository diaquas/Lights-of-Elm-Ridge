-- ModIQ Mapping Dictionary
-- Stores confirmed mapping pairs across all users for crowdsourced improvement.
-- Enhancement 1 of the AI Enhancement spec.

create table if not exists modiq_mapping_dictionary (
  id uuid primary key default gen_random_uuid(),

  -- Source side (from the vendor's sequence)
  source_name text not null,
  source_name_normalized text not null,
  source_type text not null check (source_type in ('model', 'group', 'submodel')),
  source_pixel_count integer,

  -- Destination side (from the user's layout)
  dest_name text not null,
  dest_name_normalized text not null,
  dest_type text not null check (dest_type in ('model', 'group', 'submodel')),
  dest_pixel_count integer,

  -- Metadata
  vendor_hint text,
  match_source text not null check (match_source in ('auto_confirmed', 'user_correction', 'user_manual')),
  confidence real not null default 1.0,
  times_confirmed integer not null default 1,
  first_seen timestamptz not null default now(),
  last_confirmed timestamptz not null default now(),

  -- Constraints
  unique (source_name_normalized, dest_name_normalized)
);

-- Indexes for fast lookup
create index if not exists idx_mapping_dict_source_normalized
  on modiq_mapping_dictionary (source_name_normalized);

create index if not exists idx_mapping_dict_vendor
  on modiq_mapping_dictionary (vendor_hint)
  where vendor_hint is not null;

create index if not exists idx_mapping_dict_source_type_pixels
  on modiq_mapping_dictionary (source_type, source_pixel_count)
  where source_pixel_count is not null;

create index if not exists idx_mapping_dict_times_confirmed
  on modiq_mapping_dictionary (times_confirmed desc);

-- RLS: allow anonymous reads, authenticated writes
alter table modiq_mapping_dictionary enable row level security;

create policy "Anyone can read mapping dictionary"
  on modiq_mapping_dictionary for select
  using (true);

create policy "Authenticated users can insert mappings"
  on modiq_mapping_dictionary for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update mappings"
  on modiq_mapping_dictionary for update
  to authenticated
  using (true)
  with check (true);
