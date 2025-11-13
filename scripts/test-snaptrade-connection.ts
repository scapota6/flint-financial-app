/**
 * Test SnapTrade connection and list authorizations
 */

import { listBrokerageAuthorizations } from '../server/lib/snaptrade';
import { db } from '../server/db';
import { snaptradeUsers } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testSnapTradeAuth() {
  try {
    const [user] = await db
      .select()
      .from(snaptradeUsers)
      .where(eq(snaptradeUsers.flintUserId, '29b34aee-6216-4653-b7a1-f5498a88c9f0'))
      .limit(1);
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('✅ User found:', {
      snaptradeUserId: user.snaptradeUserId,
      secretLength: user.userSecret.length
    });
    
    // List all brokerage authorizations using the correct wrapper function
    console.log('\nFetching brokerage authorizations...');
    const authorizations = await listBrokerageAuthorizations(
      user.snaptradeUserId,
      user.userSecret,
      user.flintUserId
    );
    
    console.log('\n📊 Total authorizations:', authorizations?.data?.length || 0);
    
    if (!authorizations?.data || authorizations.data.length === 0) {
      console.log('\nℹ️ No brokerage authorizations found.');
      console.log('This means the "disabled connection" in SnapTrade dashboard is from a different user or has been cleaned up.');
    } else {
      console.log('\n📋 Authorizations:');
      authorizations.data.forEach((auth: any, index: number) => {
        console.log(`\n${index + 1}. ${auth.brokerage?.name || 'Unknown'}:`);
        console.log(`   - ID: ${auth.id}`);
        console.log(`   - Type: ${auth.type}`);
        console.log(`   - Disabled: ${auth.disabled}`);
        console.log(`   - Created: ${auth.createdDate}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error?.response?.data || error?.message || error);
  }
}

testSnapTradeAuth()
  .then(() => process.exit(0))
  .catch((e) => { 
    console.error(e); 
    process.exit(1); 
  });
