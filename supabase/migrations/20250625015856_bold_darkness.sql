/*
  # Fix Storage Policies for Avatar Upload

  1. Storage Configuration
    - Create avatars bucket if it doesn't exist
    - Configure public access and file limits

  2. Security Policies
    - Public read access to avatar images
    - Users can manage their own avatar files
    - Path structure: user_id/filename.ext

  3. Notes
    - Removed GRANT statements that require owner privileges
    - RLS is already enabled on storage.objects by default in Supabase
*/

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

-- Drop existing storage policies to recreate them correctly
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create storage policies for avatars bucket
-- Policy 1: Public read access to avatar images
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects
FOR SELECT 
USING (bucket_id = 'avatars');

-- Policy 2: Users can upload their own avatar
-- Path structure: user_id/filename.ext
-- Extract user_id from the path using split_part
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Policy 3: Users can update their own avatar
CREATE POLICY "Users can update their own avatar" 
ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = split_part(name, '/', 1)
);

-- Policy 4: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = split_part(name, '/', 1)
);