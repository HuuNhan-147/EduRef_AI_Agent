# Frontend integration boundaries

## Ownership rule

The current polish assignment is CSS, Tailwind, and presentation components. Keep frontend `src/services/**`, API payload mapping, authentication, Socket.IO listeners/emits, and Agent data handlers unchanged, as well as backend, Prisma, policy, audit-chain logic, storage, and deployment. Extracting visual markup is allowed; moving or rewriting processing logic requires team agreement. Tài owns real upload/storage.

Approved exception on 2026-10-14: a separate read-only frontend observer may consume existing trace/response events. The send/stop handlers may notify this observer for display correlation only; preserve their requests, emissions and processing. The chat Verify control now navigates instead of executing the suite. Only names for demo students `2110002` and `2110004` may change in API metadata and the approved demo database; all backend source and other student fields remain protected.

When a UX requires a missing capability:

1. Confirm that the capability is absent from the current contract.
2. Define the smallest request/response or event contract needed.
3. Implement only a frontend-safe boundary or unavailable state if useful.
4. Record the backend integration point and ask for explicit authorization or backend-owner delivery.

Do not work around a missing capability with fake success, fabricated URLs, optimistic permanent state, or direct client access to protected infrastructure.

## Real upload contract

Real upload requires a backend-owned endpoint or signed-storage flow that defines:

- authentication and petition ownership;
- accepted MIME types and maximum size;
- one or multiple files and document type mapping;
- malware/content validation responsibilities;
- progress/cancellation feasibility;
- success payload containing a server-issued document ID and safe display metadata;
- retry/idempotency behavior;
- authorization for later viewing or downloading;
- retention and deletion rules.

The frontend may validate early for usability, but server validation remains authoritative. A selected local file is not an uploaded document. A successful HTTP response is not policy verification unless the response explicitly says so.

Every completed UI handoff must remind the user to coordinate the endpoint, authentication, storage, validation, and response contract with Tài until the real integration has been delivered and verified end to end.

## API and form behavior

- Use the content type accepted by the actual route. Do not send multipart data to a JSON-only handler.
- Centralize request field mapping and response normalization instead of spreading compatibility guesses through components.
- Preserve auth tokens and role checks through the existing API client.
- Distinguish network failure, validation rejection, authentication expiry, permission denial, and policy outcome in user-facing recovery states.

## Socket and streaming behavior

Quick-chat landing and full workspace must use the existing session/identity without duplicate sends or subscriptions. Automatic business handoff is deferred for this frontend pass; offer manual navigation with the current Agent unchanged. The future target remains pre-send handoff. A purely informational mode is not established by the current contract. Presentation cannot silently filter business actions, classify intent, or add another processing engine. Obtain team agreement for any later logic change.

- Correlate events with the active session/request when the contract provides identifiers.
- Register and remove matching listeners; do not leak subscriptions across mounts or roles.
- A connected socket does not prove message delivery. Use acknowledgement/timeout only if supported; otherwise provide an honest retry or HTTP fallback.
- Handle disconnect, reconnect, server error, duplicate submit, late chunks, and stale responses.
- Do not merge global logs or another user's activity into the current conversation.

## Truthful evidence

- Do not label a QR code as signed, expiring, or cryptographically verified without a corresponding signed payload and verification endpoint.
- Do not show hardcoded student identity, evidence, campus, reason, decision, or audit values as live data.
- Explicitly label isolated fixtures used by Verify Harness or demo-only screens.
- Keep the current main workflow scope. Do not restore removed legacy handlers or remove additional backend workflows during UI polish.
- Never add unconfirmed policy thresholds or dates to validation copy.
