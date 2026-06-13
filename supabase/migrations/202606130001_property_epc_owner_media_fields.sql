drop view if exists public.properties_public;

alter table public.properties
  alter column bathrooms type numeric(3,1) using bathrooms::numeric(3,1),
  add column if not exists floor_level text,
  add column if not exists has_lift boolean,
  add column if not exists available_from date;

create view public.properties_public as
select
  p.id,
  p.landlord_id,
  p.title,
  p.area,
  p.city,
  p.postcode_district,
  p.district,
  p.property_type,
  p.bedrooms,
  p.bathrooms,
  p.receptions,
  p.outside_space,
  p.parking,
  p.furnishing,
  p.description,
  p.rent_pcm,
  p.rent,
  p.status,
  p.created_at,
  p.updated_at,
  round(p.latitude::numeric, 3)::double precision as latitude,
  round(p.longitude::numeric, 3)::double precision as longitude,
  (
    select pp.public_url
    from public.property_photos pp
    where pp.property_id = p.id
    order by pp.sort_order
    limit 1
  ) as cover_photo_url,
  p.floor_level,
  p.has_lift,
  p.available_from,
  nullif(p.compliance ->> 'epcRating', '') as epc_rating,
  coalesce((p.compliance ->> 'epcExempt')::boolean, false) as epc_exempt,
  nullif(p.compliance ->> 'epcCertificateUrl', '') as epc_certificate_url,
  nullif(p.compliance ->> 'epcCertificateName', '') as epc_certificate_name,
  pr.first_name as landlord_first_name,
  pr.profile_image_url as landlord_profile_image_url,
  'Private Landlord'::text as landlord_type
from public.properties p
join public.profiles pr on pr.id = p.landlord_id
where p.status = 'live'::public.property_status;

revoke insert, update, delete, truncate, references, trigger on public.properties_public from anon, authenticated;
grant select on public.properties_public to anon, authenticated;
