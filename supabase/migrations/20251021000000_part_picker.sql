-- parts
create table if not exists part (
  id uuid primary key default gen_random_uuid(),
  canonical_mpn text not null,
  title text not null,
  brand text,
  category text,
  description text,
  attributes jsonb,
  fitment jsonb,
  synonyms text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_part_canonical_mpn on part (canonical_mpn);

-- cross identifiers
create table if not exists part_identifier (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references part(id) on delete cascade,
  id_type text check (id_type in ('MPN','SKU','OEM','UPC','EAN')),
  value text not null,
  normalized_value text not null
);

create index if not exists ix_part_identifier_part on part_identifier (part_id);
create index if not exists ix_part_identifier_normalized on part_identifier (normalized_value);

-- distributors
create table if not exists distributor (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  phone text,
  email text,
  regions text[],
  notes text
);

-- listings (display-only)
create table if not exists distributor_listing (
  id uuid primary key default gen_random_uuid(),
  distributor_id uuid not null references distributor(id) on delete cascade,
  part_id uuid not null references part(id) on delete cascade,
  sku text
);

create index if not exists ix_listing_part on distributor_listing (part_id);
create index if not exists ix_listing_distributor on distributor_listing (distributor_id);

-- Enable RLS on all tables (global catalog - read-only for authenticated users)
alter table part enable row level security;
alter table part_identifier enable row level security;
alter table distributor enable row level security;
alter table distributor_listing enable row level security;

-- Create read-only policies for authenticated users
do $$ begin
  create policy part_read_auth on part for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy part_identifier_read_auth on part_identifier for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy distributor_read_auth on distributor for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy distributor_listing_read_auth on distributor_listing for select using (true);
exception when duplicate_object then null;
end $$;


