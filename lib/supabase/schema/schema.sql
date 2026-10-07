-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Trading Setups Table
create table if not exists public.trading_setups (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade,
    symbol text not null,
    direction text not null check (direction in ('LONG', 'SHORT')),
    entry_min numeric not null,
    entry_max numeric not null,
    stop_loss numeric not null,
    take_profit_1 numeric not null,
    take_profit_2 numeric,
    risk_reward numeric not null,
    status text not null check (status in (
        'WAITING_FOR_CONFIRMATION',
        'ENTRY_TRIGGERED',
        'TP_REACHED',
        'SL_HIT',
        'INVALIDATED',
        'EXPIRED'
    )),
    invalidation_rule text not null,
    notes text,
    confluence_tags text[] default array[]::text[],
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Session Reports Table
create table if not exists public.session_reports (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    session text not null check (session in ('LONDON_OPEN', 'NEW_YORK_OPEN', 'ASIAN_WRAP')),
    timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
    bias text not null check (bias in ('BULLISH_USD', 'BEARISH_USD', 'NEUTRAL', 'RISK_OFF', 'RISK_ON')),
    volatility text not null check (volatility in ('LOW', 'NORMAL', 'HIGH', 'EXTREME')),
    executive_summary text not null,
    macro_catalysts text[] default array[]::text[],
    key_levels jsonb not null default '[]'::jsonb,
    playbook jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. User Settings Table
create table if not exists public.user_settings (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid unique references auth.users(id) on delete cascade not null,
    account_balance numeric not null default 10000.0,
    risk_per_trade numeric not null default 1.0,
    max_daily_loss numeric not null default 3.0,
    min_risk_reward numeric not null default 2.0,
    high_impact_news_buffer integer not null default 30,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.trading_setups enable row level security;
alter table public.session_reports enable row level security;
alter table public.user_settings enable row level security;

-- Setup Policies (Setups: authenticated users read/write their own; public mock fallback allowed)
create policy "Allow select on trading_setups" on public.trading_setups
    for select using (auth.uid() = user_id or user_id is null);

create policy "Allow insert on trading_setups" on public.trading_setups
    for insert with check (auth.uid() = user_id);

create policy "Allow update on trading_setups" on public.trading_setups
    for update using (auth.uid() = user_id);

-- Session Reports Policies (Readable by all authenticated and anonymous readers)
create policy "Public read session_reports" on public.session_reports
    for select using (true);