DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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

CREATE TABLE logs (
    log_id VARCHAR(12) PRIMARY KEY CHECK (log_id ~ '^[A-Za-z0-9]{1,12}$'),
    user_id CHAR(8) REFERENCES users(user_id) ON DELETE SET NULL,
    item_id VARCHAR(12) REFERENCES inventory(item_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    details TEXT
);

CREATE INDEX idx_inventory_name ON inventory (item_name);
CREATE INDEX idx_logs_timestamp ON logs (timestamp);

INSERT INTO users (user_id, name, password, role)
VALUES
('28245800', 'Susan', 's282$00', 'd'),
('68699800', 'Mark', 'm686$00', 'n'),
('48499800', 'Kayla', 'm484$00', 'm');

INSERT INTO inventory (item_id, item_name, quantity)
VALUES
('MED123ABC001', 'Morphine 10mg', 50),
('SUP001A001', 'Saline Bag', 100);

INSERT INTO logs (log_id, user_id, item_id, action, details)
VALUES
('LOG101525001', '28245800', 'MED123ABC001', 'checked_out',
 'Director approved checkout of 2 units of Morphine for OR use.'),
('LOG101525002', '68699800', 'MED123ABC001', 'checked_out',
 'Nurse Mark checked out 1 unit of Morphine for patient use.');

SELECT * FROM users;
SELECT * FROM inventory;
SELECT * FROM logs;
