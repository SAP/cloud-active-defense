CREATE DATABASE cad;

\c cad;

CREATE TABLE "protectedApps" (
    id UUID PRIMARY KEY NOT NULL,
    namespace VARCHAR(255) NOT NULL,
    application VARCHAR(255) NOT NULL,
    cu_id UUID NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL
    CONSTRAINT fk_cu_id
        FOREIGN KEY (cu_id)
        REFERENCES customers(id)
);

CREATE TABLE decoys (
    id UUID PRIMARY KEY NOT NULL,
    pa_id UUID NOT NULL,
    deployed BOOLEAN NOT NULL,
    decoy JSON NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_pa_id
        FOREIGN KEY (pa_id)
        REFERENCES "protectedApps"(id)
);

CREATE TABLE configs (
    id UUID PRIMARY KEY NOT NULL,
    pa_id UUID NOT NULL,
    deployed BOOLEAN NOT NULL,
    config JSON NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_pa_id
        FOREIGN KEY (pa_id)
        REFERENCES "protectedApps"(id)
);

CREATE TABLE logs (
    id UUID PRIMARY KEY NOT NULL,
    pa_id UUID NOT NULL,
    date INTEGER NOT NULL,
    type VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    CONSTRAINT fk_pa_id
        FOREIGN KEY (pa_id)
        REFERENCES "protectedApps"(id)
)

CREATE TABLE "apiKeys" (
    id UUID PRIMARY KEY NOT NULL,
    key VARCHAR(255) NOT NULL,
    permissions VARCHAR(255) NOT NULL,
    pa_id UUID,
    expirationDate TIMESTAMPTZ NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_pa_id
        FOREIGN KEY (pa_id)
        REFERENCES "protectedApps"(id)
);

CREATE TABLE blocklists (
    id UUID PRIMARY KEY NOT NULL,
    pa_id UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    date FLOAT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    content JSON NOT NULL
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL
);

CREATE TABLE customers (
    id UUID PRIMARY KEY NOT NULL,
    name VARCHAR(255) NOT NULL,
    kubeconfig TEXT,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL
);