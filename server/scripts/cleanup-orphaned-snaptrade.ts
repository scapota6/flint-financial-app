/**
 * Cleanup Orphaned SnapTrade Records
 * 
 * This script identifies and removes orphaned SnapTrade user records from the database.
 * Orphaned records occur when:
 * 1. A user has snaptrade_users entry but no snaptrade_connections
 * 2. A connection exists but the parent snaptrade_users record is missing
 * 
 * Usage:
 *   npm run cleanup:snaptrade -- --dry-run    # Preview what would be deleted
 *   npm run cleanup:snaptrade                 # Actually delete orphaned records
 */

import { db } from '../db';
import { snaptradeUsers, snaptradeConnections, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

interface OrphanedUser {
  flintUserId: string;
  snaptradeUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface OrphanedConnection {
  id: number;
  flintUserId: string;
  brokerageName: string;
  email: string;
}

async function findOrphanedUsers(): Promise<OrphanedUser[]> {
  const orphanedUsers = await db
    .select({
      flintUserId: snaptradeUsers.flintUserId,
      snaptradeUserId: snaptradeUsers.snaptradeUserId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(snaptradeUsers)
    .leftJoin(users, eq(users.id, snaptradeUsers.flintUserId))
    .leftJoin(
      snaptradeConnections, 
      eq(snaptradeConnections.flintUserId, snaptradeUsers.flintUserId)
    )
    .where(sql`${snaptradeConnections.id} IS NULL`);

  return orphanedUsers.map(u => ({
    flintUserId: u.flintUserId,
    snaptradeUserId: u.snaptradeUserId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
  }));
}

async function findOrphanedConnections(): Promise<OrphanedConnection[]> {
  const orphanedConns = await db
    .select({
      id: snaptradeConnections.id,
      flintUserId: snaptradeConnections.flintUserId,
      brokerageName: snaptradeConnections.brokerageName,
      email: users.email,
    })
    .from(snaptradeConnections)
    .leftJoin(users, eq(users.id, snaptradeConnections.flintUserId))
    .leftJoin(
      snaptradeUsers,
      eq(snaptradeUsers.flintUserId, snaptradeConnections.flintUserId)
    )
    .where(sql`${snaptradeUsers.flint_user_id} IS NULL`);

  return orphanedConns.map(c => ({
    id: c.id,
    flintUserId: c.flintUserId,
    brokerageName: c.brokerageName,
    email: c.email,
  }));
}

async function cleanup(dryRun: boolean = true) {
  console.log('\n🔍 SNAPTRADE ORPHANED RECORDS CLEANUP\n');
  console.log(`Mode: ${dryRun ? '🧪 DRY RUN (preview only)' : '🚨 LIVE MODE (will delete)'}\n`);

  // Find orphaned users (users without any connections)
  console.log('📋 Finding orphaned snaptrade_users (users with no connections)...');
  const orphanedUsers = await findOrphanedUsers();
  
  if (orphanedUsers.length === 0) {
    console.log('✅ No orphaned snaptrade_users found!\n');
  } else {
    console.log(`⚠️  Found ${orphanedUsers.length} orphaned snaptrade_users:\n`);
    orphanedUsers.forEach((user, i) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown';
      console.log(`  ${i + 1}. ${user.email} (${name})`);
      console.log(`     SnapTrade ID: ${user.snaptradeUserId}`);
      console.log(`     Flint User ID: ${user.flintUserId}\n`);
    });

    if (!dryRun) {
      console.log('🗑️  Deleting orphaned snaptrade_users...');
      for (const user of orphanedUsers) {
        await db
          .delete(snaptradeUsers)
          .where(eq(snaptradeUsers.flintUserId, user.flintUserId));
        console.log(`   ✓ Deleted snaptrade_users for ${user.email}`);
      }
      console.log('');
    }
  }

  // Find orphaned connections (connections without parent snaptrade_users)
  console.log('📋 Finding orphaned snaptrade_connections (connections without parent user)...');
  const orphanedConns = await findOrphanedConnections();
  
  if (orphanedConns.length === 0) {
    console.log('✅ No orphaned snaptrade_connections found!\n');
  } else {
    console.log(`⚠️  Found ${orphanedConns.length} orphaned snaptrade_connections:\n`);
    orphanedConns.forEach((conn, i) => {
      console.log(`  ${i + 1}. ${conn.email} - ${conn.brokerageName}`);
      console.log(`     Connection ID: ${conn.id}`);
      console.log(`     Flint User ID: ${conn.flintUserId}\n`);
    });

    if (!dryRun) {
      console.log('🗑️  Deleting orphaned snaptrade_connections...');
      for (const conn of orphanedConns) {
        await db
          .delete(snaptradeConnections)
          .where(eq(snaptradeConnections.id, conn.id));
        console.log(`   ✓ Deleted connection ${conn.id} for ${conn.email}`);
      }
      console.log('');
    }
  }

  // Summary
  const totalOrphaned = orphanedUsers.length + orphanedConns.length;
  
  if (totalOrphaned === 0) {
    console.log('✨ Database is clean! No orphaned records found.\n');
  } else if (dryRun) {
    console.log('📊 SUMMARY:');
    console.log(`   - Orphaned snaptrade_users: ${orphanedUsers.length}`);
    console.log(`   - Orphaned snaptrade_connections: ${orphanedConns.length}`);
    console.log(`   - Total orphaned records: ${totalOrphaned}\n`);
    console.log('💡 This was a dry run. No changes were made.');
    console.log('   To actually delete these records, run without --dry-run flag.\n');
  } else {
    console.log('✅ CLEANUP COMPLETE:');
    console.log(`   - Deleted ${orphanedUsers.length} orphaned snaptrade_users`);
    console.log(`   - Deleted ${orphanedConns.length} orphaned snaptrade_connections`);
    console.log(`   - Total records deleted: ${totalOrphaned}\n`);
  }

  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Run cleanup
cleanup(isDryRun).catch((error) => {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
});
