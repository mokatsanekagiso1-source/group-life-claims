create table scheme (
    id                  uuid primary key,
    name                varchar(200) not null,
    registration_number varchar(50)  not null unique,
    contact_email       varchar(200) not null,
    created_at          timestamptz  not null
);

create table policy (
    id                    uuid primary key,
    scheme_id             uuid          not null references scheme (id),
    policy_number         varchar(50)   not null unique,
    cover_multiple        numeric(5, 2) not null check (cover_multiple > 0),
    waiting_period_months integer       not null check (waiting_period_months >= 0),
    effective_date        date          not null,
    status                varchar(20)   not null,
    created_at            timestamptz   not null
);

create index idx_policy_scheme on policy (scheme_id);

create table policy_cover_type (
    policy_id  uuid        not null references policy (id) on delete cascade,
    cover_type varchar(20) not null,
    primary key (policy_id, cover_type)
);

create table member (
    id              uuid primary key,
    policy_id       uuid           not null references policy (id),
    employee_number varchar(50)    not null,
    first_name      varchar(100)   not null,
    last_name       varchar(100)   not null,
    email           varchar(200)   not null,
    date_of_birth   date           not null,
    annual_salary   numeric(14, 2) not null check (annual_salary > 0),
    join_date       date           not null,
    exit_date       date,
    status          varchar(20)    not null,
    created_at      timestamptz    not null,
    unique (policy_id, employee_number),
    check (exit_date is null or exit_date >= join_date)
);

create index idx_member_policy on member (policy_id);

create table beneficiary (
    id                 uuid primary key,
    member_id          uuid          not null references member (id) on delete cascade,
    full_name          varchar(200)  not null,
    relationship       varchar(50)   not null,
    allocation_percent numeric(5, 2) not null check (allocation_percent > 0 and allocation_percent <= 100)
);

create index idx_beneficiary_member on beneficiary (member_id);

create table age_band_rate (
    id           bigint generated always as identity primary key,
    min_age      integer        not null,
    max_age      integer        not null,
    monthly_rate numeric(10, 8) not null check (monthly_rate > 0),
    check (min_age <= max_age)
);

create sequence claim_number_seq start with 1001;

create table claim (
    id           uuid primary key,
    claim_number varchar(30)    not null unique,
    member_id    uuid           not null references member (id),
    cover_type   varchar(20)    not null,
    event_date   date           not null,
    description  varchar(2000)  not null,
    status       varchar(20)    not null,
    cover_amount numeric(14, 2) not null,
    submitted_at timestamptz    not null,
    decided_at   timestamptz,
    version      bigint         not null
);

create index idx_claim_status on claim (status, submitted_at);
create index idx_claim_member on claim (member_id);

-- Append-only audit trail: one row per claim state change, including the initial submission.
create table claim_transition (
    id          uuid primary key,
    claim_id    uuid          not null references claim (id),
    from_status varchar(20),
    to_status   varchar(20)   not null,
    actor       varchar(100)  not null,
    reason      varchar(1000),
    occurred_at timestamptz   not null
);

create index idx_claim_transition_claim on claim_transition (claim_id, occurred_at);

-- Payout split frozen at approval time, so later beneficiary changes do not alter a decided claim.
create table claim_payout (
    id                 uuid primary key,
    claim_id           uuid           not null references claim (id),
    beneficiary_name   varchar(200)   not null,
    allocation_percent numeric(5, 2)  not null,
    amount             numeric(14, 2) not null
);

create index idx_claim_payout_claim on claim_payout (claim_id);

create table app_user (
    id            uuid primary key,
    username      varchar(100) not null unique,
    password_hash varchar(100) not null,
    role          varchar(20)  not null,
    member_id     uuid references member (id)
);
