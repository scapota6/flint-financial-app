/**
 * Quick script to delete a SnapTrade user
 * Usage: npx tsx delete-snaptrade-user.ts
 */

import { Snaptrade } from 'snaptrade-typescript-sdk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const snaptrade = new Snaptrade({
  clientId: process.env.SNAPTRADE_CLIENT_ID!,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

async function deleteSnapTradeUser(userId: string) {
  try {
    console.log(`\n🗑️  Deleting SnapTrade user: ${userId}`);
    
    const response = await snaptrade.authentication.deleteSnapTradeUser({ userId });
    
    console.log('\n✅ Success! User deletion queued.');
    console.log('Response:', response.data);
    console.log('\nℹ️  Note: SnapTrade will send a USER_DELETED webhook when deletion is complete.');
    
  } catch (error: any) {
    console.error('\n❌ Error deleting user:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Details:', error.response?.data);
  }
}

// Delete user 45137738-v2
deleteSnapTradeUser('45137738-v2');
