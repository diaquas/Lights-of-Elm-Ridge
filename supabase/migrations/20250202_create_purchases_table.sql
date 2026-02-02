-- Migration: Create purchases table for storing completed orders
-- Run this in Supabase Dashboard → SQL Editor

-- Create purchases table
create table if not exists public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  stripe_session_id text unique not null,
  stripe_payment_intent text,
  sequence_ids integer[] not null,
  amount_total integer not null, -- in cents
  currency text default 'usd',
  status text default 'completed' check (status in ('pending', 'completed', 'failed', 'refunded')),
  customer_email text,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

-- Create index for faster user lookups
create index if not exists purchases_user_id_idx on public.purchases(user_id);

-- Create index for Stripe session lookups
create index if not exists purchases_stripe_session_idx on public.purchases(stripe_session_id);

-- Enable Row Level Security
alter table public.purchases enable row level security;

-- Policy: Users can view their own purchases
create policy "Users can view own purchases"
  on public.purchases
  for select
  using (auth.uid() = user_id);

-- Policy: Service role can insert purchases (for webhook)
-- Note: Service role bypasses RLS, so this is just for documentation
comment on table public.purchases is 'Stores completed sequence purchases. Inserted by Stripe webhook.';

-- Grant access to authenticated users (read only)
grant select on public.purchases to authenticated;
