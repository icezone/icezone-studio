#!/usr/bin/env node
/**
 * validate-rls-migration.js
 *
 * Pre-migration validation script to ensure new database migrations
 * include Row-Level Security (RLS) configuration.
 *
 * Usage:
 *   node scripts/validate-rls-migration.js <migration-file.sql>
 *
 * Checks:
 * 1. Every CREATE TABLE has corresponding ALTER TABLE ... ENABLE ROW LEVEL SECURITY
 * 2. Tables with user_id column have at least one RLS policy defined
 * 3. Every table with RLS enabled has at least one policy
 */

const fs = require('fs');
const path = require('path');

function validateMigration(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Extract table names from CREATE TABLE statements
  const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi;
  const tables = [];
  let match;
  while ((match = createTableRegex.exec(content)) !== null) {
    tables.push(match[1].toLowerCase());
  }

  if (tables.length === 0) {
    console.log('✅ No new tables created in this migration');
    return true;
  }

  console.log(`📋 Found ${tables.length} table(s): ${tables.join(', ')}`);

  let hasErrors = false;

  // Check each table has RLS enabled
  const rlsEnabledRegex = /alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/gi;
  const rlsEnabled = new Set();
  while ((match = rlsEnabledRegex.exec(content)) !== null) {
    rlsEnabled.add(match[1].toLowerCase());
  }

  for (const table of tables) {
    if (!rlsEnabled.has(table)) {
      console.error(`❌ Table "${table}" missing RLS enable statement`);
      console.error(`   Add: ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      hasErrors = true;
    }
  }

  // Check tables with RLS have at least one policy
  const policyRegex = /create\s+policy\s+[^o]+on\s+(?:public\.)?(\w+)/gi;
  const tablesWithPolicies = new Set();
  while ((match = policyRegex.exec(content)) !== null) {
    tablesWithPolicies.add(match[1].toLowerCase());
  }

  for (const table of tables) {
    if (rlsEnabled.has(table) && !tablesWithPolicies.has(table)) {
      console.warn(`⚠️  Table "${table}" has RLS enabled but no policies defined`);
      console.warn(`   This will block ALL access. Add at least one policy or use USING (true) for public access.`);
      hasErrors = true;
    }
  }

  // Check tables with user_id column have appropriate policies
  const userIdTableRegex = /create\s+table[^;]*user_id\s+uuid\s+references\s+auth\.users/gi;
  const userOwnedTables = [];
  while ((match = userIdTableRegex.exec(content)) !== null) {
    // Find the table name by looking backward from match
    const beforeMatch = content.substring(0, match.index);
    const tableMatch = beforeMatch.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi);
    if (tableMatch) {
      const lastTable = tableMatch[tableMatch.length - 1];
      const tableNameMatch = lastTable.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/i);
      if (tableNameMatch) {
        userOwnedTables.push(tableNameMatch[1].toLowerCase());
      }
    }
  }

  for (const table of userOwnedTables) {
    // Check if there's a policy using auth.uid()
    const userPolicyRegex = new RegExp(`create\\s+policy[^;]*on\\s+(?:public\\.)?${table}[^;]*auth\\.uid\\(\\)`, 'gi');
    if (!userPolicyRegex.test(content)) {
      console.warn(`⚠️  Table "${table}" has user_id column but no auth.uid() policy`);
      console.warn(`   Consider adding policy: USING (auth.uid() = user_id)`);
    }
  }

  if (hasErrors) {
    console.error('\n❌ Migration validation failed');
    return false;
  }

  console.log('\n✅ Migration validation passed');
  return true;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/validate-rls-migration.js <migration-file.sql>');
    process.exit(1);
  }

  const migrationPath = path.resolve(args[0]);
  const isValid = validateMigration(migrationPath);
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateMigration };
