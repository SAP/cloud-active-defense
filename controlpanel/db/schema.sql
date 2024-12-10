CREATE DATABASE cad;

CREATE TABLE cad.decoys (
    id UUID PRIMARY KEY NOT NULL,
    state VARCHAR(255) NOT NULL,
    pa_id UUID NOT NULL,
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