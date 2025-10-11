#!/usr/bin/env tsx
import 'dotenv/config';
import { listAllSnapTradeUsers, authApi } from '../lib/snaptrade';
import { db } from '../db';
import { snaptradeUsers, snaptradeConnections } from '@shared/schema';

async function cleanupSnapTradeUsers() {
  try {
    console.log('🧹 Starting SnapTrade user cleanup...\n');
    
    console.log('📋 Step 1: Listing all SnapTrade users from API...');
    const response = await listAllSnapTradeUsers();
    const userIds = response.data || [];
    
    console.log(`Found ${userIds.length} users in SnapTrade dashboard:\n`);
    
    userIds.forEach((userId: string, index: number) => {
      console.log(`${index + 1}. User ID: ${userId}`);
    });
    
    console.log('\n🗑️  Step 2: Deleting all users from SnapTrade API...');
    for (const userId of userIds) {
      try {
        if (!userId || typeof userId !== 'string') {
          console.error(`❌ Skipping invalid user ID:`, userId);
          continue;
        }
        await authApi.deleteSnapTradeUser({ userId });
        console.log(`✅ Deleted: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Failed to delete ${userId}:`, error.message);
      }
    }
    
    console.log('\n🗄️  Step 3: Clearing snaptrade_connections table...');
    const deletedConnections = await db.delete(snaptradeConnections);
    console.log(`✅ Cleared snaptrade_connections table`);
    
    console.log('\n🗄️  Step 4: Clearing snaptrade_users table...');
    const deletedUsers = await db.delete(snaptradeUsers);
    console.log(`✅ Cleared snaptrade_users table`);
    
    console.log('\n✨ Cleanup complete! All SnapTrade users deleted and database cleared.');
    
    console.log('\n📊 Final verification:');
    const finalCheck = await listAllSnapTradeUsers();
    console.log(`SnapTrade API users remaining: ${finalCheck.data?.length || 0}`);
    
    const dbUsers = await db.select().from(snaptradeUsers);
    console.log(`Database snaptrade_users remaining: ${dbUsers.length}`);
    
    const dbConnections = await db.select().from(snaptradeConnections);
    console.log(`Database snaptrade_connections remaining: ${dbConnections.length}`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Cleanup failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      responseBody: error.responseBody
    });
    process.exit(1);
  }
}

cleanupSnapTradeUsers();
