# ADR-005: Storage Strategy

**Status:** Accepted  
**Date:** 2026-07  
**Layer:** L1 Infrastructure

## Context

Save, collection, passport, rooms need persistence.

## Decision

- L1 MVP: localStorage (device-scoped)
- L2 Engine Cloud module: abstraction for future sync
- Creator uploads: future Supabase Storage bucket

## Consequences

- Guest-first play works offline
- Cloud Save Pro = L7 revenue when sync ships
