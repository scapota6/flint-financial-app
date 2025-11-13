/**
 * Delete orphaned SnapTrade users that aren't in our database
 * This will cascade-delete all their connections and stop billing
 * 
 * SAFETY FEATURES:
 * - Requires explicit --execute flag to actually delete (dry-run by default)
 * - Shows what will be deleted before confirmation
 * - Asks for YES confirmation before deleting
 * 
 * USAGE:
 *   npx tsx scripts/delete-orphaned-snaptrade-users.ts           # Dry-run (safe)
 *   npx tsx scripts/delete-orphaned-snaptrade-users.ts --execute # Actually delete
 */

import { Snaptrade } from 'snaptrade-typescript-sdk';
import { db } from '../server/db';
import { snaptradeUsers } from '../shared/schema';
import * as readline from 'readline';

const snaptrade = new Snaptrade({
  clientId: process.env.SNAPTRADE_CLIENT_ID!,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');

/**
 * Prompt user for confirmation
 */
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (type YES to confirm): `, (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase() === 'YES');
    });
  });
}

async function deleteOrphanedUsers() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  SnapTrade Orphaned User Cleanup Script');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (isDryRun) {
      console.log('🔒 DRY-RUN MODE (no deletions will be made)');
      console.log('   To actually delete, run with: --execute\n');
    } else {
      console.log('⚠️  DELETION MODE - Users will be permanently deleted!');
      console.log('   This affects production SnapTrade billing!\n');
    }
    
    console.log('🔍 Analyzing SnapTrade users vs. database...\n');
    
    // Get all users from SnapTrade
    const snaptradeResponse = await snaptrade.authentication.listSnapTradeUsers();
    const snaptradeUserIds = snaptradeResponse.data || [];
    
    console.log(`📊 Total users in SnapTrade API: ${snaptradeUserIds.length}`);
    
    // Get all users from our database
    const dbUsers = await db.select().from(snaptradeUsers);
    const dbUserIds = new Set(dbUsers.map(u => u.snaptradeUserId));
    
    console.log(`📊 Total users in database:     ${dbUsers.length}\n`);
    
    // Find orphaned users (in SnapTrade but not in database)
    const orphanedUsers = snaptradeUserIds.filter(id => !dbUserIds.has(id));
    
    if (orphanedUsers.length === 0) {
      console.log('✅ No orphaned users found! Everything is in sync.');
      console.log('   No action needed.\n');
      return;
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`⚠️  FOUND ${orphanedUsers.length} ORPHANED USER(S)`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('These users exist in SnapTrade but NOT in your database:');
    console.log('(They are being billed but not tracked in Flint)\n');
    
    orphanedUsers.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    
    console.log('\n');
    
    if (isDryRun) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('  DRY-RUN COMPLETE');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log(`Would delete ${orphanedUsers.length} user(s) from SnapTrade.`);
      console.log('\nTo actually delete these users, run:');
      console.log('  npx tsx scripts/delete-orphaned-snaptrade-users.ts --execute\n');
      return;
    }
    
    // In execute mode, ask for confirmation
    console.log('═══════════════════════════════════════════════════════');
    console.log('  CONFIRMATION REQUIRED');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('⚠️  WARNING: This will PERMANENTLY delete these users from SnapTrade!');
    console.log('   - All their brokerage connections will be removed');
    console.log('   - They will need to re-connect if they use Flint again');
    console.log('   - This stops billing for these orphaned users\n');
    
    const confirmed = await askConfirmation('Are you absolutely sure you want to delete these users?');
    
    if (!confirmed) {
      console.log('\n❌ Deletion cancelled by user.');
      console.log('   No changes were made.\n');
      return;
    }
    
    console.log('\n🗑️  Deleting orphaned users from SnapTrade...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const userId of orphanedUsers) {
      try {
        process.stdout.write(`   Deleting ${userId}... `);
        await snaptrade.authentication.deleteSnapTradeUser({ userId });
        console.log('✅ Success');
        successCount++;
      } catch (error: any) {
        console.log(`❌ Failed: ${error?.message}`);
        errorCount++;
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  CLEANUP COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`✅ Successfully deleted: ${successCount} user(s)`);
    if (errorCount > 0) {
      console.log(`❌ Failed to delete:     ${errorCount} user(s)`);
    }
    console.log('\nAll orphaned users have been removed from SnapTrade.');
    console.log('Billing will stop for these users.\n');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error?.message || error);
    process.exit(1);
  }
}

deleteOrphanedUsers()
  .then(() => process.exit(0))
  .catch((e) => { 
    console.error(e); 
    process.exit(1); 
  });
