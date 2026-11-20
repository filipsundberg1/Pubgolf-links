# Security Specification — December Links Pubgolf Tour

## 1. Data Invariants
1. **Default-Deny Catch-All**: All paths not explicitly matched in `/databases/{database}/documents` are unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Requirement**: All write operations (`create`, `update`, `delete`) require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
3. **Path Variable Hardening**: Every single-document ID (`courseId`, `holeId`, `playerId`) must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
4. **Master Gate Relational Sync**: Every write to `/courses/{courseId}/holes/{holeId}` verifies via `get()` that the parent `/courses/{courseId}` exists and its `ownerId` matches `request.auth.uid`.
5. **Identity Integrity & Immutability**:
   - A `Course` can only be created or updated if `ownerId == request.auth.uid`, and `ownerId` + `courseId` are immutable on update.
   - A `PlayerProfile` at `/players/{playerId}` can only be created or updated if `playerId == request.auth.uid` and `incoming().uid == request.auth.uid`.
6. **Zero PII in Public Profiles**: `/players/{playerId}` strictly forbids storing `email`, `phone`, or `address` via `.keys().hasOnly(...)`.
7. **Query Enforcer on List Operations**: `allow list` on `/courses`, `/courses/{courseId}/holes`, and `/players` evaluates `resource.data` (e.g., `resource.data.tourId == 'december-links-2026'` or `resource.data.courseId == courseId`), never delegating security to blanket `isSignedIn()`.
8. **Temporal Integrity**: `updatedAt` must equal server timestamp `request.time`.

## 2. The "Dirty Dozen" Payloads (All Must Return `PERMISSION_DENIED`)
1. **Payload 1 (Identity Spoofing on Course Create)**: Authenticated user `user_A` attempts to create `/courses/c1` with `ownerId: "user_B"`.
2. **Payload 2 (Unverified Email Write)**: User with `email_verified: false` attempts to create `/players/user_A`.
3. **Payload 3 (Shadow Field / Ghost Property Injection)**: User sends valid `PlayerProfile` plus `"isAdmin": true` or `"email": "leak@example.com"`.
4. **Payload 4 (Path Poisoning Attack)**: User attempts to create `/courses/invalid$id!with*spaces` or a 500-character ID.
5. **Payload 5 (Cross-Player Score Tampering)**: Authenticated `user_A` attempts to update `sipsHole1` on `/players/user_B`.
6. **Payload 6 (Value Poisoning on Score Update)**: Authenticated `user_A` updates `sipsHole1` with `"one"` (string) or `-5` or `999` (out-of-bounds integer).
7. **Payload 7 (Orphaned Subcollection Hole Write)**: User attempts to create `/courses/non_existent_course/holes/hole-1` where parent course does not exist or belongs to another owner.
8. **Payload 8 (Immutable Owner Transfer)**: Course owner attempts to update `/courses/c1` changing `ownerId` to another UID.
9. **Payload 9 (Client Timestamp Forgery)**: User attempts to write `updatedAt: Timestamp.fromMillis(1000000)` instead of `request.time`.
10. **Payload 10 (Denial-of-Wallet Oversized Bio String)**: User attempts to create `/players/user_A` with a 5,000-character `bio` string (`maxLength` is 320).
11. **Payload 11 (Invalid Enum Injection on Hole)**: Course owner attempts to set `drinkType: "moonshine"` or `par: 99` on `/courses/c1/holes/hole-1`.
12. **Payload 12 (Unfiltered Blanket List Scraping)**: Client queries `/players` without matching `tourId == 'december-links-2026'`.
