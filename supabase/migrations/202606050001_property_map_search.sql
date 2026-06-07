alter table public.properties
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists properties_location_text_idx
  on public.properties using gin (
    to_tsvector(
      'english',
      coalesce(address_line_1, '') || ' ' ||
      coalesce(address_line_2, '') || ' ' ||
      coalesce(area, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(postcode, '') || ' ' ||
      coalesce(postcode_district, '')
    )
  );

create index if not exists properties_latitude_longitude_idx
  on public.properties (latitude, longitude);
