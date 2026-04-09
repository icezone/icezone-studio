## Why

Critical security vulnerability detected in Supabase: Row-Level Security (RLS) is disabled on public schema tables, allowing anyone with the project URL to read, edit, and delete all data without authentication. This violates data protection fundamentals and exposes the application to unauthorized access, data breaches, and malicious manipulation.

## What Changes

- Enable Row-Level Security (RLS) on all public schema tables in Supabase
- Create RLS policies for authenticated user access patterns
- Add RLS policies for service role operations where needed
- Implement security checks in database migration workflow
- Add documentation for RLS policy patterns and maintenance

## Capabilities

### New Capabilities

- `database-security`: Supabase Row-Level Security configuration, policies for authentication-based access control, and migration safeguards to prevent future RLS-disabled tables

### Modified Capabilities

<!-- No existing requirements are changing - this is a new security implementation -->

## Impact

- **Database**: All tables in public schema will have RLS enabled with appropriate policies
- **Authentication**: Access patterns will enforce authenticated user context
- **APIs**: Existing API calls will work unchanged (Supabase client handles RLS automatically)
- **Development**: Future migrations must include RLS policies
- **Performance**: Minimal - RLS policies are evaluated at database level efficiently
