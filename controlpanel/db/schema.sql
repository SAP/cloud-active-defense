CREATE DATABASE cad;

CREATE TABLE cad.decoys (
    id UUID PRIMARY KEY NOT NULL,
    state VARCHAR(255) NOT NULL,
    pa_id UUID NOT NULL,
    deployed BOOLEAN NOT NULL,
    decoy JSON NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL
    CONSTRAINT fk_pa_id
        FOREIGN KEY (pa_id)
        REFERENCES protectedApps(id)
);

CREATE TABLE cad.protectedApps (
    id UUID PRIMARY KEY NOT NULL,
    namespace VARCHAR(255) NOT NULL,
    application VARCHAR(255) NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL
);

CREATE TABLE cad.config (
    id UUID PRIMARY KEY NOT NULL,
    pa_id UUID NOT NULL,
    deployed BOOLEAN NOT NULL,
    config JSON NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL,
    updatedAt TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_pa_id
        FOREIGN KEY (pa_id)
        REFERENCES protectedApps(id)
);

CREATE TABLE cad.logs (
    id UUID PRIMARY KEY NOT NULL,
    date INTEGER NOT NULL,
    type VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
)