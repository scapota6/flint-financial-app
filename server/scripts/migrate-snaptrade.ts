/**
 * One-time migration script to move SnapTrade user data from file storage to database
 * 
 * This script:
 * 1. Reads user registration data from data/snaptrade-users.json
 * 2. Migrates to snaptradeUsers table in the database
 * 3. Provides duplicate prevention via PRIMARY KEY constraint on flintUserId
 * 
 * Run with: npx tsx server/scripts/migrate-snaptrade.ts
 */

import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { snaptradeUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface FileRecord {
  userId: string;
  userSecret: string;
  flintUserId: string;
}

type FileDatabase = Record<string, FileRecord>;

async function migrate() {
  console.log('='.repeat(60));
  console.log('SnapTrade Migration: File Storage → Database');
  console.log('='.repeat(60));
  console.log();

  const filePath = path.join(process.cwd(), 'data', 'snaptrade-users.json');

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error('❌ Error: File not found:', filePath);
    process.exit(1);
  }

  // Read file data
  console.log('📂 Reading file:', filePath);
  let fileData: FileDatabase;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    fileData = JSON.parse(fileContent) as FileDatabase;
    console.log(`✅ Found ${Object.keys(fileData).length} users in file`);
    console.log();
  } catch (error: any) {
    console.error('❌ Error reading file:', error.message);
    process.exit(1);
  }

  // Migration statistics
  const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  };

  // Migrate each user
  console.log('🔄 Starting migration...');
  console.log();

  for (const [key, record] of Object.entries(fileData)) {
    stats.total++;
    const flintUserId = record.flintUserId || key;
    
    console.log(`[${stats.total}] Processing user: ${flintUserId}`);
    console.log(`    SnapTrade User ID: ${record.userId}`);
    console.log(`    Has User Secret: ${!!record.userSecret}`);

    try {
      // Check if already exists
      const [existing] = await db
        .select()
        .from(snaptradeUsers)
        .where(eq(snaptradeUsers.flintUserId, flintUserId))
        .limit(1);

      if (existing) {
        console.log(`    ⚠️  Already exists in database - skipping`);
        stats.skipped++;
      } else {
        // Insert into database
        await db.insert(snaptradeUsers).values({
          flintUserId: flintUserId,
          userSecret: record.userSecret,
          createdAt: new Date(),
          rotatedAt: null
        });
        console.log(`    ✅ Migrated successfully`);
        stats.migrated++;
      }
    } catch (error: any) {
      console.log(`    ❌ Error: ${error.message}`);
      stats.errors++;
    }
    console.log();
  }

  // Summary
  console.log('='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total records:     ${stats.total}`);
  console.log(`Successfully migrated: ${stats.migrated}`);
  console.log(`Skipped (exists):  ${stats.skipped}`);
  console.log(`Errors:            ${stats.errors}`);
  console.log();

  if (stats.migrated > 0) {
    console.log('✅ Migration completed successfully!');
    console.log();
    console.log('⚠️  IMPORTANT: Verify the migration before deleting the file');
    console.log(`   File location: ${filePath}`);
  } else if (stats.skipped === stats.total) {
    console.log('ℹ️  All records already exist in database - no migration needed');
  } else {
    console.log('❌ Migration completed with errors');
    process.exit(1);
  }

  process.exit(0);
}

// Run migration
migrate().catch((error) => {
  console.error('❌ Fatal error during migration:', error);
  process.exit(1);
});
