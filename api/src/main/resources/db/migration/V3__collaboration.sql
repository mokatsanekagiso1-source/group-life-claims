-- Assessor who has picked up a claim. Null while the claim waits in the shared queue.
alter table claim add column assignee varchar(100);

create index idx_claim_assignee on claim (assignee);

-- Conversation on a claim. Internal notes are visible to staff only.
create table claim_note (
    id          uuid primary key,
    claim_id    uuid          not null references claim (id),
    author      varchar(100)  not null,
    author_role varchar(20)   not null,
    body        varchar(4000) not null,
    internal    boolean       not null,
    created_at  timestamptz   not null
);

create index idx_claim_note_claim on claim_note (claim_id, created_at);

-- Supporting documents (death certificates, medical reports and so on), stored with the claim.
create table claim_document (
    id           uuid primary key,
    claim_id     uuid         not null references claim (id),
    file_name    varchar(255) not null,
    content_type varchar(100) not null,
    size_bytes   bigint       not null check (size_bytes > 0),
    category     varchar(30)  not null,
    content      bytea        not null,
    uploaded_by  varchar(100) not null,
    uploaded_at  timestamptz  not null
);

create index idx_claim_document_claim on claim_document (claim_id, uploaded_at);

-- In-app notifications, addressed to a username.
create table notification (
    id         uuid primary key,
    recipient  varchar(100)  not null,
    type       varchar(40)   not null,
    title      varchar(200)  not null,
    body       varchar(1000) not null,
    link       varchar(200),
    read_at    timestamptz,
    created_at timestamptz   not null
);

create index idx_notification_recipient on notification (recipient, created_at);
