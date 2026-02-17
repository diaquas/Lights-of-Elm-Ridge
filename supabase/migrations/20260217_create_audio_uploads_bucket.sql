-- Create storage bucket for temporary audio uploads (TRK:IQ → Demucs)
-- Files are uploaded by authenticated users and cleaned up after processing.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-uploads',
  'audio-uploads',
  false,
  52428800, -- 50MB max file size
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac']
);

-- Authenticated users can upload files to their own folder
CREATE POLICY "Users can upload audio files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read their own files
CREATE POLICY "Users can read own audio files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own files (cleanup)
CREATE POLICY "Users can delete own audio files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role can manage all files (for Edge Function signed URLs)
CREATE POLICY "Service role full access to audio uploads"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'audio-uploads')
  WITH CHECK (bucket_id = 'audio-uploads');
