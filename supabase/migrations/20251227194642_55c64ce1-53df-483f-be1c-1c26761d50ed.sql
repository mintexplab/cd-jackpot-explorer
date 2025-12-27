-- Create price tracking table for wishlist items
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wishlist_id UUID NOT NULL REFERENCES public.wishlist(id) ON DELETE CASCADE,
  discogs_release_id INTEGER NOT NULL,
  target_price DECIMAL(10,2),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_min_price DECIMAL(10,2),
  last_median_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  alert_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Users can view their own price alerts
CREATE POLICY "Users can view their own price alerts"
ON public.price_alerts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own price alerts
CREATE POLICY "Users can create their own price alerts"
ON public.price_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own price alerts
CREATE POLICY "Users can update their own price alerts"
ON public.price_alerts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own price alerts
CREATE POLICY "Users can delete their own price alerts"
ON public.price_alerts
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX idx_price_alerts_wishlist_id ON public.price_alerts(wishlist_id);