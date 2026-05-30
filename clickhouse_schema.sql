-- ClickHouse schema for high-throughput telemetry data

CREATE TABLE IF NOT EXISTS healstack_events (
    project_id UUID,
    environment String,
    event_type String,
    session_id String,
    timestamp DateTime64(3),
    payload String -- JSON string containing custom event properties
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, event_type, timestamp);

CREATE TABLE IF NOT EXISTS healstack_crashes (
    project_id UUID,
    environment String,
    error_name String,
    error_message String,
    stack_trace String,
    timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, error_name, timestamp);