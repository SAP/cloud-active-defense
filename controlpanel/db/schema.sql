CREATE DATABASE cad;

\c cad;

CREATE TABLE "protectedApps" (
    id UUID PRIMARY KEY NOT NULL,
    namespace VARCHAR(255) NOT NULL,
    application VARCHAR(255) NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL
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

CREATE TABLE config (
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