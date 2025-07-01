/*
  # Allow null phone_number in whatsapp_numbers table

  1. Changes
    - Remove NOT NULL constraint from phone_number column in whatsapp_numbers table
    - This allows the application to save WhatsApp connection records during the initial connection process
    - The phone_number will be populated once the Z-API instance is fully connected

  2. Rationale
    - During WhatsApp connection via Z-API, we need to save the initial state before the phone number is available
    - The phone number becomes available only after the QR code is scanned and connection is established
    - This change allows the connection flow to work properly without violating database constraints
*/

-- Remove NOT NULL constraint from phone_number column
ALTER TABLE whatsapp_numbers 
ALTER COLUMN phone_number DROP NOT NULL;