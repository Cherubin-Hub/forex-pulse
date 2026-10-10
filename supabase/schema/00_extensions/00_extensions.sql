-- ============================================================================
-- SCRIPT: 00_extensions.sql
-- TYPE:   PostgreSQL Extension Setup
-- SCOPE:  Cryptographic & UUID generation capabilities
-- ============================================================================

BEGIN;

-- Enable UUID extension for auto-generating primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for cryptographic hash utilities
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

COMMIT;