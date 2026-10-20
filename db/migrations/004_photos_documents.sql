CREATE TYPE document_type AS ENUM ('LICENSE', 'INSURANCE', 'CRIMINAL_RECORD');
CREATE TYPE document_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

CREATE TABLE boat_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boat_id UUID NOT NULL REFERENCES boats (id) ON DELETE CASCADE,
    object_key TEXT NOT NULL,
    thumb_key TEXT,
    position SMALLINT NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX one_cover_per_boat
    ON boat_photos (boat_id)
    WHERE is_cover;

CREATE TABLE documents(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lanchero_id UUID NOT NULL REFERENCES lancheros (id) ON DELETE CASCADE,
    boat_id UUID REFERENCES boats (id) ON DELETE CASCADE,
    type document_type NOT NULL,
    status document_status NOT NULL DEFAULT 'PENDING',
    object_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    expires_at DATE,
    reject_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users (id),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT insurance_needs_boat CHECK (type <> 'INSURANCE' OR boat_id IS NOT NULL),
    CONSTRAINT expiry_required CHECK (type = 'CRIMINAL_RECORD' OR expires_at IS NOT NULL)
);

CREATE UNIQUE INDEX one_current_document
    ON documents (lanchero_id, COALESCE(boat_id, '00000000-0000-0000-0000-000000000000'), type)
    WHERE is_current;

