-- ============================================================================
-- SNAPTRADE ORPHANED RECORDS CLEANUP
-- ============================================================================
-- This script identifies and removes orphaned SnapTrade records.
--
-- STEP 1: Run the SELECT queries to preview what will be deleted
-- STEP 2: Run the DELETE queries to actually remove the orphaned records
-- ============================================================================

-- ============================================================================
-- STEP 1: PREVIEW ORPHANED RECORDS (READ-ONLY)
-- ============================================================================

-- Find orphaned snaptrade_users (users with no connections)
SELECT 
  'ORPHANED snaptrade_users' as record_type,
  su.flint_user_id,
  su.snaptrade_user_id,
  u.email,
  u.first_name,
  u.last_name
FROM snaptrade_users su
LEFT JOIN users u ON u.id = su.flint_user_id
LEFT JOIN snaptrade_connections sc ON sc.flint_user_id = su.flint_user_id
WHERE sc.id IS NULL
ORDER BY u.email;

-- Find orphaned snaptrade_connections (connections without parent snaptrade_users)
SELECT 
  'ORPHANED snaptrade_connections' as record_type,
  sc.id,
  sc.flint_user_id,
  sc.brokerage_name,
  sc.brokerage_authorization_id,
  u.email
FROM snaptrade_connections sc
LEFT JOIN users u ON u.id = sc.flint_user_id
LEFT JOIN snaptrade_users su ON su.flint_user_id = sc.flint_user_id
WHERE su.flint_user_id IS NULL
ORDER BY u.email;

-- ============================================================================
-- STEP 2: DELETE ORPHANED RECORDS (DESTRUCTIVE - USE WITH CAUTION)
-- ============================================================================
-- ⚠️ WARNING: The following queries will PERMANENTLY DELETE data!
-- ⚠️ Only run these after reviewing the preview results above!
-- ============================================================================

-- Delete orphaned snaptrade_users (users with no connections)
-- UNCOMMENT THE LINES BELOW TO RUN:
/*
DELETE FROM snaptrade_users
WHERE flint_user_id IN (
  SELECT su.flint_user_id
  FROM snaptrade_users su
  LEFT JOIN snaptrade_connections sc ON sc.flint_user_id = su.flint_user_id
  WHERE sc.id IS NULL
);
*/

-- Delete orphaned snaptrade_connections (connections without parent snaptrade_users)
-- UNCOMMENT THE LINES BELOW TO RUN:
/*
DELETE FROM snaptrade_connections
WHERE id IN (
  SELECT sc.id
  FROM snaptrade_connections sc
  LEFT JOIN snaptrade_users su ON su.flint_user_id = sc.flint_user_id
  WHERE su.flint_user_id IS NULL
);
*/

-- ============================================================================
-- STEP 3: VERIFY CLEANUP (READ-ONLY)
-- ============================================================================
-- Run these queries to confirm all orphaned records are gone

-- Count remaining snaptrade_users
SELECT 
  'snaptrade_users count' as info,
  COUNT(*) as total_count
FROM snaptrade_users;

-- Count remaining snaptrade_connections
SELECT 
  'snaptrade_connections count' as info,
  COUNT(*) as total_count
FROM snaptrade_connections;

-- Verify all snaptrade_users have at least one connection
SELECT 
  'Users without connections' as info,
  COUNT(*) as count
FROM snaptrade_users su
LEFT JOIN snaptrade_connections sc ON sc.flint_user_id = su.flint_user_id
WHERE sc.id IS NULL;
