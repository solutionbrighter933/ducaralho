/*
  # Remove Google Sheets Integration

  1. Changes
    - Drops the google_sheets_integrations table
    - Drops the refresh_google_sheets_token function
    - Removes all related policies and indexes

  This migration removes the Google Sheets integration while keeping the Google Calendar integration intact.
*/

-- Drop the refresh function first (to avoid dependency issues)
DROP FUNCTION IF EXISTS refresh_google_sheets_token(uuid);

-- Drop the table (this will automatically drop all associated indexes and constraints)
DROP TABLE IF EXISTS google_sheets_integrations;