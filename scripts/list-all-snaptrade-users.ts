/**
 * List ALL SnapTrade users globally (admin endpoint)
 * This will show users that might not be in our database
 */

import { connectionsApi } from '../server/lib/snaptrade';
import { Snaptrade } from 'snaptrade-typescript-sdk';

const snaptrade = new Snaptrade({
  clientId: process.env.SNAPTRADE_CLIENT_ID!,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

async function listAllSnapTradeUsers() {
  try {
    console.log('🔍 Listing ALL users in SnapTrade account...\n');
    
    // Use the authentication API to list all users
    const response = await snaptrade.authentication.listSnapTradeUsers();
    const users = response.data || [];
    
    console.log(`📊 Total users in SnapTrade: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('⚠️  No users found');
      return;
    }
    
    console.log('📋 All SnapTrade users:');
    for (const user of users) {
      console.log(`\n  User ID: ${user}`);
    }
    
    console.log('\n\n🔍 Now checking each user for authorizations...\n');
    
    let disabledFound = false;
    
    for (const userId of users) {
      console.log(`\nChecking user: ${userId}...`);
      
      try {
        // We can't list authorizations without the userSecret
        // But we can try with a common pattern or check our database
        console.log('  ⚠️  Cannot check authorizations without userSecret');
      } catch (error: any) {
        console.log(`  Error: ${error?.message}`);
      }
    }
    
    console.log('\n\n💡 To delete the disabled connection, we need:');
    console.log('   1. The user ID');
    console.log('   2. The user secret');
    console.log('   3. The authorization ID');
    console.log('\nSince the disabled user is not in our database, you may need to:');
    console.log('   - Contact SnapTrade support to manually remove it');
    console.log('   - OR provide the userSecret if you know which test user it belongs to');
    
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
    console.error('Full error:', JSON.stringify(error, null, 2));
  }
}

listAllSnapTradeUsers()
  .then(() => process.exit(0))
  .catch((e) => { 
    console.error(e); 
    process.exit(1); 
  });
