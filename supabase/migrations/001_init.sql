-- Өдрийн хоол захиалгын систем
-- Supabase SQL Editor дээр бүтнээр нь ажиллуулна.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  role text not null default 'employee' check (role in ('admin', 'employee')),
  branch_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_branch_id_fkey;
alter table public.profiles
  add constraint profiles_branch_id_fkey
  foreign key (branch_id) references public.branches (id) on delete set null;

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text,
  price integer not null check (price > 0),
  available_quantity integer not null check (available_quantity >= 0),
  order_deadline time not null,
  meal_date date not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  branch_id uuid not null references public.branches (id),
  total_amount integer not null check (total_amount >= 0),
  status text not null default 'new' check (
    status in ('new', 'confirmed', 'preparing', 'ready', 'received', 'cancelled')
  ),
  note text not null default '',
  customer_last_name text not null,
  customer_first_name text not null,
  customer_phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  meal_id uuid not null references public.meals (id),
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  total_price integer not null check (total_price >= 0)
);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  company_name text not null default 'ӨДРИЙН ХООЛ',
  support_phone text not null default ''
);

insert into public.app_settings (id, company_name, support_phone)
values (1, 'ӨДРИЙН ХООЛ', '88110022')
on conflict (id) do nothing;

create index if not exists meals_meal_date_idx on public.meals (meal_date);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_branch_id_idx on public.orders (branch_id);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_meal_id_idx on public.order_items (meal_id);

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.role := old.role;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, first_name, last_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin' else 'employee' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.place_order(
  p_meal_id uuid,
  p_branch_id uuid,
  p_quantity integer,
  p_last_name text,
  p_first_name text,
  p_phone text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_meal public.meals%rowtype;
  v_now timestamp;
  v_today date;
  v_seq integer;
  v_number text;
  v_order public.orders%rowtype;
  v_total integer;
begin
  if v_user is null then
    raise exception 'UNAUTHORIZED';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'INSUFFICIENT_QUANTITY';
  end if;
  if length(trim(coalesce(p_last_name, ''))) = 0 or length(trim(coalesce(p_first_name, ''))) = 0 then
    raise exception 'UNAUTHORIZED';
  end if;

  select * into v_meal from public.meals where id = p_meal_id for update;
  if not found then
    raise exception 'MEAL_NOT_FOUND';
  end if;
  if not v_meal.is_active then
    raise exception 'MEAL_INACTIVE';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id and is_active) then
    raise exception 'BRANCH_INACTIVE';
  end if;

  v_now := now() at time zone 'Asia/Ulaanbaatar';
  v_today := v_now::date;
  if v_meal.meal_date < v_today then
    raise exception 'DEADLINE_PASSED';
  end if;
  if v_meal.available_quantity < p_quantity then
    raise exception 'INSUFFICIENT_QUANTITY';
  end if;

  v_total := v_meal.price * p_quantity;
  update public.meals
    set available_quantity = available_quantity - p_quantity,
        updated_at = now()
    where id = v_meal.id;

  perform pg_advisory_xact_lock(hashtext('orders-' || to_char(v_today, 'YYYYMMDD')));
  select coalesce(max(substring(order_number from 14)::int), 0) + 1
    into v_seq
  from public.orders
  where order_number like 'ORD-' || to_char(v_today, 'YYYYMMDD') || '-%';
  v_number := 'ORD-' || to_char(v_today, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  insert into public.orders (
    order_number, user_id, branch_id, total_amount, status, note,
    customer_last_name, customer_first_name, customer_phone
  ) values (
    v_number, v_user, p_branch_id, v_total, 'new', coalesce(p_note, ''),
    trim(p_last_name), trim(p_first_name), trim(p_phone)
  ) returning * into v_order;

  insert into public.order_items (order_id, meal_id, quantity, unit_price, total_price)
  values (v_order.id, v_meal.id, p_quantity, v_meal.price, v_total);

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number);
end;
$$;

create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_updated integer;
begin
  if not exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('new', 'confirmed', 'preparing', 'ready', 'received', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status = p_status then
    return;
  end if;

  for v_item in select * from public.order_items where order_id = v_order.id loop
    if v_order.status <> 'cancelled' and p_status = 'cancelled' then
      update public.meals
        set available_quantity = available_quantity + v_item.quantity,
            updated_at = now()
        where id = v_item.meal_id;
    elsif v_order.status = 'cancelled' and p_status <> 'cancelled' then
      update public.meals
        set available_quantity = available_quantity - v_item.quantity,
            updated_at = now()
        where id = v_item.meal_id
          and available_quantity >= v_item.quantity;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'INSUFFICIENT_QUANTITY';
      end if;
    end if;
  end loop;

  update public.orders
    set status = p_status, updated_at = now()
    where id = v_order.id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.meals enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.app_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select to authenticated
  using (is_active or public.is_admin());

drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists meals_select on public.meals;
create policy meals_select on public.meals
  for select to authenticated
  using (
    is_active
    or public.is_admin()
    or exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.meal_id = meals.id and o.user_id = auth.uid()
    )
  );

drop policy if exists meals_write on public.meals;
create policy meals_write on public.meals
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings
  for select to authenticated
  using (true);

drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant execute on function public.place_order(uuid, uuid, integer, text, text, text, text) to authenticated;
grant execute on function public.set_order_status(uuid, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('meal-images', 'meal-images', true)
on conflict (id) do nothing;

drop policy if exists meal_images_read on storage.objects;
create policy meal_images_read on storage.objects
  for select to public
  using (bucket_id = 'meal-images');

drop policy if exists meal_images_insert on storage.objects;
create policy meal_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-images' and public.is_admin());

drop policy if exists meal_images_update on storage.objects;
create policy meal_images_update on storage.objects
  for update to authenticated
  using (bucket_id = 'meal-images' and public.is_admin());

drop policy if exists meal_images_delete on storage.objects;
create policy meal_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-images' and public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.branches, public.meals, public.orders, public.order_items, public.app_settings to authenticated;

insert into public.branches (id, name, address)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Төв салбар', 'Сүхбаатарын талбай, 1-р хороо'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Баянзүрх салбар', '13-р хороолол'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Хан-Уул салбар', 'Зайсан'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Сүхбаатар салбар', 'Бага тойруу'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'Сонгинохайрхан салбар', '21-р хороолол')
on conflict (id) do nothing;
