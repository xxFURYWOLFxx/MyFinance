# JWT Session Management & Security Settings

## Overview
Add proper session handling with timestamps to JWTs, admin-adjustable expiration times, and optional IP-based session binding.

## Changes

### 1. SystemSettings Model
- New `system_settings` table: `key` (string PK), `value` (string), `updated_at` (datetime)
- Default settings: `access_token_expire_minutes=30`, `refresh_token_expire_days=7`, `ip_binding_enabled=false`
- In-memory cache with TTL to avoid DB reads on every request

### 2. Enhanced JWT Claims
- Add `iat` (issued-at UTC timestamp) to all tokens
- Add `ip` claim (SHA-256 hash of client IP) when IP binding is enabled
- Validation: reject tokens where IP hash doesn't match current request IP (when binding enabled)

### 3. Admin API
- `GET /api/admin/security-settings` — returns current security settings
- `PUT /api/admin/security-settings` — update settings (admin only)

### 4. Admin UI
- New "Security Settings" card in Admin Dashboard page
- Controls: access token expiry (5min-1440min), refresh token expiry (1-90 days), IP binding toggle
- Save with toast feedback

### 5. Token Validation Updates
- `deps.py` updated to check `iat` exists and validate IP binding when enabled
- Login endpoint reads expiry from DB settings instead of config defaults
