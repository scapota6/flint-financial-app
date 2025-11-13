/**
 * Clean up orphaned SnapTrade connection for seba.rod136@gmail.com
 */

import { listBrokerageAuthorizations } from '../server/lib/snaptrade';
import { db } from '../server/db';
import { snaptradeUsers, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function cleanupOrphanedConnection() {
  try {
    // First check if the user exists in our database
    const [flintUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, '435bab88-4a15-4898-adae-775b76d25254'))
      .limit(1);
    
    if (!flintUser) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('✅ User found:', {
      id: flintUser.id,
      email: flintUser.email
    });
    
    // Check if they have SnapTrade registration
    const [snapUser] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, flintUser.id))
      .limit(1);
    
    if (!snapUser) {
      console.log('\n⚠️ User has no SnapTrade registration in our database');
      console.log('This confirms the orphaned connection - it exists in SnapTrade but not linked in our system');
      return;
    }
    
    console.log('\n✅ SnapTrade registration found:', {
      snaptradeUserId: snapUser.snaptradeUserId,
      secretLength: snapUser.userSecret.length
    });
    
    // List their authorizations
    console.log('\nFetching brokerage authorizations...');
    const authorizations = await listBrokerageAuthorizations(
      snapUser.snaptradeUserId,
      snapUser.userSecret,
      flintUser.id
    );
    
    console.log('\n📊 Total authorizations:', authorizations?.data?.length || 0);
    
    if (!authorizations?.data || authorizations.data.length === 0) {
      console.log('\nℹ️ No authorizations found for this user');
    } else {
      console.log('\n📋 Authorizations:');
      authorizations.data.forEach((auth: any, index: number) => {
        console.log(`\n${index + 1}. ${auth.brokerage?.name || 'Unknown'}:`);
        console.log(`   - ID: ${auth.id}`);
        console.log(`   - Type: ${auth.type}`);
        console.log(`   - Disabled: ${auth.disabled}`);
        console.log(`   - Created: ${auth.createdDate}`);
        
        if (auth.disabled) {
          console.log(`   ⚠️ THIS IS THE ORPHANED CONNECTION - needs cleanup`);
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error?.message || error);
  }
}

cleanupOrphanedConnection()
  .then(() => process.exit(0))
  .catch((e) => { 
    console.error(e); 
    process.exit(1); 
  });
