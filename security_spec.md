# 407 ACTG ORM — Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Zero Unverified Access**: Any user whose `/userRoles/{uid}` document does not exist or has `status != 'Verified'` cannot read or write `/ormSubmissions`, `/auditLogs`, or `/notifications`.
2. **Self-Registration Lock**: A newly authenticated user can only create `/userRoles/{uid}` with `status == 'Pending'`, `commandRole == 'Pilot'`, and `isAdmin == false` (except the bootstrapped Admin with verified email `ajigamaliel30@gmail.com`). Only an Admin can mutate `status`, `commandRole`, or `isAdmin`.
3. **Pilot Isolation**: Standard verified Pilots (`commandRole == 'Pilot'`) can only read and create their own `/ormSubmissions` (`pilotId == request.auth.uid`). They can never read another pilot's ORM or approve/reject any ORM.
4. **Command Role Authority & Anti-Self-Approval**: Only verified Command personnel (`CO`, `GOO`, `Comd`) can read other pilots' ORMs and sign off pending missions. `CO` and `GOO` officers may never approve or reject an ORM where `resource.data.pilotId == request.auth.uid`; `Comd` (Commander) holds final authority to sign off on all pending missions, including their own. Furthermore, approver authority must meet or exceed `resource.data.requiredMdaRole` (`CO < GOO < Comd`).
5. **Terminal State Locking**: Once an ORM reaches `CLEARED`, `APPROVED`, or `REJECTED`, no further client updates are permitted (unless Admin correction).
6. **Strict Immutability**: `/auditLogs` cannot be updated or deleted by any client. `/ormSubmissions` cannot be deleted by any client.
7. **PII Isolation**: User email addresses and FCM tokens live exclusively under `/users/{uid}/private/info` and are readable only by `isOwner(uid)` or `isAdmin()`.
8. **Temporal & Schema Integrity**: Every `createdAt`, `submittedAt`, `decidedAt`, `updatedAt`, and `timestamp` must equal `request.time`. All strings and arrays have bounded sizes, and all document IDs match `^[a-zA-Z0-9_\-]+$`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)

1. **Self-Verification Bypass**: New pilot creates `/userRoles/{uid}` with `status: "Verified"`, `commandRole: "Pilot"`, `isAdmin: false`.
2. **Self-Escalation to Commander**: New pilot creates `/userRoles/{uid}` with `status: "Pending"`, `commandRole: "Comd"`, `isAdmin: true`.
3. **Unverified Pilot ORM Submission**: Pending user (`status: "Pending"`) attempts `create` on `/ormSubmissions/orm_001`.
4. **Cross-Pilot ORM Snooping**: Verified `Pilot` attempts `get` or `list` on another pilot's `/ormSubmissions/orm_other`.
5. **Identity Spoofing on ORM Create**: Verified Pilot submits ORM with `pilotId: "someone_else_uid"`.
6. **Elevated Risk Auto-Clear Cheat**: Verified Pilot submits 12-point ORM with `status: "CLEARED"` instead of `"PENDING CO SIGN-OFF"`.
7. **Self-Approval Attack**: Verified `CO` submits a 9-point ORM (`pilotId == coUid`), then attempts `update` setting `status: "APPROVED"`, `decisionByUid: coUid`.
8. **Insufficient Authority Sign-Off**: Verified `CO` attempts to approve a 14-point `HIGH` risk ORM requiring `GOO` (`requiredMdaRole: "GOO"`).
9. **Terminal State Tampering**: Verified `Comd` attempts to update an already `APPROVED` or `CLEARED` ORM back to `REJECTED` or mutate `totalScore`.
10. **Shadow Field / Ghost Field Injection**: Verified `CO` approves a pending ORM while injecting extra ghost field `isOverride: true` or altering `totalScore: 2`.
11. **Audit Log Deletion / Tampering**: Verified `Comd` or `Admin` attempts `update` or `delete` on `/auditLogs/log_001`.
12. **PII Snooping & Unverified Email Spoof**: Non-admin user attempts `get` on `/users/otherUid/private/info`, or attacker with `email: "ajigamaliel30@gmail.com"` and `email_verified: false` attempts admin write to `/userRoles/victim`.
