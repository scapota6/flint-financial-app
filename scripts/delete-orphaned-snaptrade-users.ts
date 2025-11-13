/**
 * Delete orphaned SnapTrade users that aren't in our database
 * This will cascade-delete all their connections and stop billing
 */

import { Snaptrade } from 'snaptrade-typescript-sdk';
import { db } from '../server/db';
import { snaptradeUsers } from '../shared/schema';
import { eq } from 'drizzle-orm';

const snaptrade = new Snaptrade({
  clientId: process.env.SNAPTRADE_CLIENT_ID!,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

async function deleteOrphanedUsers() {
  try {
    console.log('🔍 Finding orphaned SnapTrade users...\n');
    
    // Get all users from SnapTrade
    const snaptradeResponse = await snaptrade.authentication.listSnapTradeUsers();
    const snaptradeUserIds = snaptradeResponse.data || [];
    
    console.log(`📊 Total users in SnapTrade: ${snaptradeUserIds.length}`);
    
    // Get all users from our database
    const dbUsers = await db.select().from(snaptradeUsers);
    const dbUserIds = new Set(dbUsers.map(u => u.snaptradeUserId));
    
    console.log(`📊 Total users in database: ${dbUsers.length}\n`);
    
    // Find orphaned users (in SnapTrade but not in database)
    const orphanedUsers = snaptradeUserIds.filter(id => !dbUserIds.has(id));
    
    if (orphanedUsers.length === 0) {
      console.log('✅ No orphaned users found!');
      return;
    }
    
    console.log(`⚠️  Found ${orphanedUsers.length} orphaned user(s):\n`);
    orphanedUsers.forEach(id => console.log(`   - ${id}`));
    
    console.log('\n🗑️  Deleting orphaned users...\n');
    
    for (const userId of orphanedUsers) {
      try {
        console.log(`Deleting user: ${userId}...`);
        await snaptrade.authentication.deleteSnapTradeUser({ userId });
        console.log(`✅ Successfully deleted user: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error deleting ${userId}:`, error?.message);
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    console.log('All orphaned users and their disabled connections have been removed.');
    
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
  }
}

deleteOrphanedUsers()
  .then(() => process.exit(0))
  .catch((e) => { 
    console.error(e); 
    process.exit(1); 
  });
