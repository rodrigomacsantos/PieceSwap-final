-- Add message length constraint
ALTER TABLE public.messages ADD CONSTRAINT message_length CHECK (length(content) <= 5000);

-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('listings_images', 'listings_images', true);

-- Storage policies for listing images
CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings_images');

CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'listings_images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own listing images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'listings_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own listing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'listings_images' AND auth.uid()::text = (storage.foldername(name))[1]);