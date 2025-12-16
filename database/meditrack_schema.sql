DROP TABLE IF EXISTS user_style CASCADE;
DROP TABLE IF EXISTS audit_reports CASCADE;
DROP TABLE IF EXISTS inventory_snapshots CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS requests CASCADE;

CREATE TABLE users (
    user_id CHAR(8) PRIMARY KEY CHECK (user_id ~ '^[0-9]{8}$'), 
	name TEXT NOT NULL,
    password TEXT NOT NULL, 
    role VARCHAR(1) CHECK (role IN ('n', 'm', 'd')) NOT NULL
);

CREATE TABLE inventory (
    item_id VARCHAR(12) PRIMARY KEY CHECK (item_id ~ '^[A-Za-z0-9]{1,12}$'),
    item_name VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 0 CHECK (quantity >= 0)
);

CREATE TABLE inventory_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    snapshot_at TIMESTAMP NOT NULL,
    item_id VARCHAR(12) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (snapshot_at, item_id)
);

CREATE INDEX idx_inventory_snapshots_at ON inventory_snapshots (snapshot_at);

CREATE TABLE audit_reports (
    report_id VARCHAR(36) PRIMARY KEY,
    report_type VARCHAR(20) NOT NULL,
    period VARCHAR(10) NOT NULL CHECK (period IN ('day', 'week', 'month', 'custom')),
    reference_date DATE,
    file_name TEXT NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL   
);

CREATE INDEX idx_audit_reports_expires ON audit_reports (expires_at);
CREATE INDEX idx_audit_reports_created ON audit_reports (created_at DESC);

CREATE TABLE logs (
    log_id VARCHAR(12) PRIMARY KEY CHECK (log_id ~ '^[A-Za-z0-9]{1,12}$'),
    user_id CHAR(8) REFERENCES users(user_id) ON DELETE SET NULL,
    item_id VARCHAR(12) REFERENCES inventory(item_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    details TEXT,
    alert_level VARCHAR(10) DEFAULT 'normal' CHECK (alert_level IN ('normal', 'soft', 'critical'))
);

CREATE TABLE IF NOT EXISTS requests (
    request_id VARCHAR(12) PRIMARY KEY CHECK (request_id ~ '^[A-Za-z0-9]{1,12}$'),
    user_id CHAR(8) REFERENCES users(user_id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    item_id VARCHAR(12) REFERENCES inventory(item_id) ON DELETE SET NULL,
    item_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
);

CREATE TABLE user_style (
    user_id CHAR(8) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    sesh_limit INT DEFAULT 0 CHECK (sesh_limit >= 0 AND sesh_limit <= 5),
    dash_style VARCHAR(10) DEFAULT 'blue' CHECK (dash_style IN ('blue', 'green', 'grey', 'orange'))
);

INSERT INTO users (user_id, name, password, role)
VALUES
('28245800', 'Susan', 's282$00', 'd'),
('68699800', 'Mark', 'm686$00', 'n'),
('48499800', 'Kayla', 'k484$00', 'm');

INSERT INTO inventory (item_id, item_name, quantity)
VALUES
('MED123ABC001', 'Morphine 10mg', 50),
('SUP001A001', 'Saline Bag', 100);

INSERT INTO logs (log_id, user_id, item_id, action, details)
VALUES
('LOG101525001', '28245800', 'MED123ABC001', 'checked_out',
 'Director approved checkout of 2 units of Morphine for OR use.', 'normal'),
('LOG101525002', '68699800', 'MED123ABC001', 'checked_out',
 'Nurse Mark checked out 1 unit of Morphine for patient use.', 'normal');

SELECT * FROM users;
SELECT * FROM inventory;
SELECT * FROM logs;
