#!/bin/bash
# deploy-migrations.sh - Deploy pending Supabase migrations

set -e

# Load Supabase credentials
if [ -f .env.supabase ]; then
    export $(cat .env.supabase | grep -v '^#' | xargs)
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN not found. Please run 'npx supabase login' first."
    exit 1
fi

echo "🚀 Deploying migrations to Supabase..."
echo "   Project: $SUPABASE_PROJECT_REF"
echo ""

# Check pending migrations
echo "📋 Checking migration status..."
npx supabase migration list

echo ""
read -p "⚠️  Push all pending migrations to remote database? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Push migrations
echo ""
echo "📤 Pushing migrations..."
npx supabase db push

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify in Supabase dashboard: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_REF/database/tables"
echo "2. Run tests: npm test"
echo "3. Check application logs for any RLS-related errors"
