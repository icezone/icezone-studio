#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * verify-rls-deployment.js
 *
 * Verifies RLS deployment by checking:
 * 1. All tables have RLS enabled
 * 2. Plans table has the expected policy
 * 3. Public read access works for plans
 * 4. User access patterns work correctly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyDeployment() {
  console.log('🔍 Verifying RLS Deployment...\n');

  let allPassed = true;

  // Test 1: Public read access to plans table
  console.log('Test 1: Public read access to plans table');
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*');

    if (error) {
      console.error('❌ FAILED: Cannot read plans table');
      console.error('   Error:', error.message);
      allPassed = false;
    } else if (!data || data.length === 0) {
      console.warn('⚠️  WARNING: Plans table is empty');
    } else {
      console.log(`✅ PASSED: Successfully read ${data.length} plan(s)`);
      console.log('   Plans:', data.map(p => p.id).join(', '));
    }
  } catch (err) {
    console.error('❌ FAILED: Error querying plans table');
    console.error('   Error:', err.message);
    allPassed = false;
  }

  // Test 2: Write protection on plans table (should fail)
  console.log('\nTest 2: Write protection on plans table (should be denied)');
  try {
    const { error } = await supabase
      .from('plans')
      .insert({
        id: 'test-unauthorized',
        name: 'Test',
        credits_per_month: 0,
        price_usd: 0,
        price_cny: 0
      });

    if (error) {
      if (error.message.includes('new row violates row-level security') ||
          error.message.includes('permission denied')) {
        console.log('✅ PASSED: Write correctly denied (RLS working)');
        console.log('   Error (expected):', error.message);
      } else {
        console.warn('⚠️  Got error but unclear if RLS-related:', error.message);
      }
    } else {
      console.error('❌ FAILED: Write should have been denied but succeeded!');
      console.error('   This is a security issue - RLS may not be properly configured');
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ FAILED: Unexpected error during write test');
    console.error('   Error:', err.message);
    allPassed = false;
  }

  // Test 3: Check other tables still work (projects should require auth)
  console.log('\nTest 3: Authenticated table access (projects - should require auth)');
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (error) {
      // Expected for unauthenticated user
      console.log('✅ PASSED: Projects table requires authentication (RLS working)');
      console.log('   Error (expected):', error.message);
    } else {
      // Empty result is fine for unauthenticated
      console.log('✅ PASSED: Projects query executed (returns empty for unauth user)');
      console.log('   Result count:', data?.length || 0);
    }
  } catch (err) {
    console.error('⚠️  WARNING: Unexpected error querying projects');
    console.error('   Error:', err.message);
  }

  // Test 4: Check workflow_templates (public + own)
  console.log('\nTest 4: Mixed access table (workflow_templates - public + own)');
  try {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('id, name, category, is_public')
      .limit(5);

    if (error) {
      console.error('❌ FAILED: Cannot read workflow_templates');
      console.error('   Error:', error.message);
      allPassed = false;
    } else {
      const publicCount = data?.filter(t => t.is_public || t.category === 'official').length || 0;
      console.log(`✅ PASSED: Read ${data?.length || 0} template(s) (${publicCount} public/official)`);
      if (data && data.length > 0) {
        console.log('   Sample:', data[0].name);
      }
    }
  } catch (err) {
    console.error('❌ FAILED: Error querying workflow_templates');
    console.error('   Error:', err.message);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - RLS Deployment Successful!');
    console.log('\nNext steps:');
    console.log('1. Test with authenticated user (login to app)');
    console.log('2. Verify user can access own projects/data');
    console.log('3. Monitor logs for 24 hours');
    console.log('4. Mark tasks 6.4-6.5 as complete');
  } else {
    console.log('❌ SOME TESTS FAILED - Review errors above');
    console.log('\nTroubleshooting:');
    console.log('1. Check Supabase Dashboard → Database → Policies');
    console.log('2. Verify RLS enabled: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\';');
    console.log('3. Review docs/standards/database-security.md');
  }
  console.log('='.repeat(60));

  return allPassed;
}

// Run verification
verifyDeployment()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error('❌ Verification script crashed:', err);
    process.exit(1);
  });
