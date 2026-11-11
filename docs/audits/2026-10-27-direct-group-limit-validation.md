# Direct group limit — validation plan (2026-10-27)

## Finding
The live `public.direct_create_group(group_title text, member_ids uuid[])` function accepts up to 49 additional IDs, while the product decision is a maximum of 20 total participants.

## Proposed isolated fix
- Count the creator as one participant; accept at most 19 additional members.
- Reject duplicate member IDs explicitly.
- Preserve existing authentication, title validation, self-membership checks, block checks, and inserts.
- This branch contains a migration only. It has not been applied to Supabase and has not been merged or deployed.

## Required validation before merge/deploy
1. Unauthenticated invocation is rejected.
2. A title shorter than 2 or longer than 80 characters is rejected.
3. 1–19 unique, unblocked member IDs are accepted (subject to valid existing users and schema constraints).
4. 20 additional IDs are rejected (would exceed 20 total participants).
5. Duplicate IDs are rejected clearly.
6. Null IDs and the creator's own ID are rejected.
7. A blocked member is rejected.
8. A failure leaves no partial conversation or membership rows (transaction rollback).
9. Confirm the Direct UI uses the same total-participant limit and presents a clear validation message.
10. Run migration in a disposable/test Supabase project first; do not run directly against production as a test.

## Rollback
Restore the previous definition of `public.direct_create_group` from the currently deployed migration/function definition. Do not rollback by deleting group or membership data.

## Status
Prepared in branch `fix/direct-group-member-limit`; review and test required. No production changes made.