-- FSFVI Operation Logs Table
-- ============================
-- Tracks all FSFVI service operations for audit and monitoring purposes

CREATE TABLE fsfvi_operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Additional metadata
    government_id UUID REFERENCES governments(id) ON DELETE CASCADE,
    operation_duration_ms BIGINT,
    error_message TEXT,
    request_metadata JSONB,

    CONSTRAINT valid_status CHECK (status IN ('success', 'failure', 'partial'))
);

-- Indexes for performance
CREATE INDEX idx_fsfvi_logs_user_id ON fsfvi_operation_logs(user_id);
CREATE INDEX idx_fsfvi_logs_government_id ON fsfvi_operation_logs(government_id);
CREATE INDEX idx_fsfvi_logs_operation ON fsfvi_operation_logs(operation);
CREATE INDEX idx_fsfvi_logs_created_at ON fsfvi_operation_logs(created_at);
CREATE INDEX idx_fsfvi_logs_status ON fsfvi_operation_logs(status);

-- Composite index for common queries
CREATE INDEX idx_fsfvi_logs_user_operation ON fsfvi_operation_logs(user_id, operation, created_at DESC);
