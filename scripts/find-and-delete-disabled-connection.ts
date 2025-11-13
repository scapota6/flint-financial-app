/**
 * Find and delete the disabled connection across ALL SnapTrade users
 */

import { db } from '../server/db';
import { snaptradeUsers } from '../shared/schema';
import { connectionsApi } from '../server/lib/snaptrade';

async function findAndDeleteDisabledConnection() {
  try {
    console.log('🔍 Searching all SnapTrade users for disabled connections...\n');
    
    // Get ALL SnapTrade users from our database
    const allSnapUsers = await db.select().from(snaptradeUsers);
    
    console.log(`Found ${allSnapUsers.length} SnapTrade user(s) in database\n`);
    
    let foundDisabled = false;
    
    for (const snapUser of allSnapUsers) {
      console.log(`\n📋 Checking user: ${snapUser.snaptradeUserId.slice(0, 8)}...`);
      
      try {
        const response = await connectionsApi.listBrokerageAuthorizations({
          userId: snapUser.snaptradeUserId,
          userSecret: snapUser.userSecret
        });
        
        const authorizations = response.data || [];
        console.log(`   Total authorizations: ${authorizations.length}`);
        
        for (const auth of authorizations) {
          const isDisabled = auth.disabled === true;
          console.log(`   - ${auth.brokerage?.name || 'Unknown'}: ${isDisabled ? '❌ DISABLED' : '✅ Active'}`);
          
          if (isDisabled) {
            foundDisabled = true;
            console.log(`\n⚠️  FOUND DISABLED CONNECTION!`);
            console.log(`   Authorization ID: ${auth.id}`);
            console.log(`   Brokerage: ${auth.brokerage?.name}`);
            console.log(`   User ID: ${snapUser.snaptradeUserId}`);
            console.log(`   Created: ${auth.createdDate}`);
            
            // Delete the disabled connection
            console.log(`\n🗑️  Deleting disabled connection...`);
            await connectionsApi.removeBrokerageAuthorization({
              userId: snapUser.snaptradeUserId,
              userSecret: snapUser.userSecret,
              authorizationId: auth.id
            });
            
            console.log(`✅ Successfully deleted disabled connection!`);
          }
        }
      } catch (error: any) {
        console.log(`   ⚠️  Error checking user: ${error?.message}`);
      }
    }
    
    if (!foundDisabled) {
      console.log('\n⚠️  No disabled connections found in database users');
      console.log('The disabled connection might be from a user not in your database.');
      console.log('You may need to contact SnapTrade support to clean it up.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
  }
}

findAndDeleteDisabledConnection()
  .then(() => process.exit(0))
  .catch((e) => { 
    console.error(e); 
    process.exit(1); 
  });
