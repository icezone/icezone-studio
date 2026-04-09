## ADDED Requirements

### Requirement: All tables SHALL have Row-Level Security enabled
The system SHALL enable Row-Level Security (RLS) on all tables in the public schema to prevent unauthorized access to data.

#### Scenario: RLS enabled on existing tables
- **WHEN** auditing database tables
- **THEN** all tables in public schema have RLS enabled

#### Scenario: New tables have RLS enforced
- **WHEN** creating a new table via migration
- **THEN** RLS MUST be explicitly enabled before migration completes

### Requirement: Authenticated users SHALL have controlled data access
The system SHALL implement RLS policies that grant authenticated users access only to their own data or publicly accessible data.

#### Scenario: User accesses own data
- **WHEN** authenticated user queries their own records
- **THEN** system allows read and write access

#### Scenario: User attempts to access other user's data
- **WHEN** authenticated user queries another user's records
- **THEN** system denies access unless explicitly shared

#### Scenario: Anonymous user attempts data access
- **WHEN** unauthenticated user queries any table
- **THEN** system denies access unless table has public read policy

### Requirement: Service role SHALL have unrestricted access
The system SHALL implement RLS policies that allow service role (backend operations) to bypass RLS for administrative operations.

#### Scenario: Service role performs admin operation
- **WHEN** service role executes database operation
- **THEN** system grants full access bypassing RLS

#### Scenario: API endpoint uses service role for batch operations
- **WHEN** API endpoint needs to query across users
- **THEN** system allows service role to access all data

### Requirement: RLS policies SHALL follow principle of least privilege
The system SHALL implement RLS policies that grant only the minimum necessary permissions for each operation type (SELECT, INSERT, UPDATE, DELETE).

#### Scenario: User can read but not modify public data
- **WHEN** user queries a read-only public table
- **THEN** system allows SELECT but denies INSERT, UPDATE, DELETE

#### Scenario: User can create their own records
- **WHEN** user inserts a new record
- **THEN** system allows INSERT with user_id set to authenticated user

### Requirement: Database migrations SHALL validate RLS configuration
The system SHALL include checks in the migration workflow to prevent deploying tables without RLS enabled and policies defined.

#### Scenario: Migration without RLS fails validation
- **WHEN** migration creates table without enabling RLS
- **THEN** system rejects migration with error message

#### Scenario: Migration with RLS passes validation
- **WHEN** migration creates table with RLS enabled and policies defined
- **THEN** system allows migration to proceed

### Requirement: System SHALL document RLS policy patterns
The system SHALL maintain documentation of RLS policy patterns for common access control scenarios to guide future development.

#### Scenario: Developer needs to add new table
- **WHEN** developer consults RLS documentation
- **THEN** documentation provides policy templates for authenticated access, owner-only access, and public read patterns

#### Scenario: Developer needs to modify existing policies
- **WHEN** developer reviews table policies
- **THEN** documentation explains policy structure and how to test changes safely
