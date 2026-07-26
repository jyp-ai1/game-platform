# ADR-001: Supabase for Backend

**Status:** Accepted  
**Date:** 2026-07  
**Layer:** L1 Infrastructure

## Context

Need scores, analytics, admin CRM without custom backend team.

## Decision

Use Supabase for PostgreSQL, scores API, analytics events. localStorage for guest/offline MVP.

## Consequences

- Fast iteration, no server ops
- Cross-device sync requires Supabase Realtime (future ADR)
- Auth migration path needed for Creator accounts
