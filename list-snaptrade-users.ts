/**
 * List all SnapTrade users
 * Usage: npx tsx list-snaptrade-users.ts
 */

import { Snaptrade } from 'snaptrade-typescript-sdk';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const snaptrade = new Snaptrade({
  clientId: process.env.SNAPTRADE_CLIENT_ID!,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

async function listAllSnapTradeUsers() {
  try {
    console.log('\n📋 Listing all SnapTrade users...\n');
    
    const response = await snaptrade.authentication.listSnapTradeUsers();
    
    const users = response.data || [];
    
    console.log(`✅ Found ${users.length} SnapTrade users:\n`);
    
    users.forEach((userId: string, index: number) => {
      console.log(`${index + 1}. ${userId}`);
    });
    
    console.log(`\n✅ Total: ${users.length} users`);
    
  } catch (error: any) {
    console.error('\n❌ Error listing users:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    console.error('Details:', error.response?.data);
  }
}

listAllSnapTradeUsers();
