-- Update SwapCoins packages with new conversion rate (1€ = 100 SwapCoins)
-- Starter: 500 coins for 4.99€
UPDATE public.swapcoins_packages
SET coins = 500, updated_at = now()
WHERE name = 'Starter';

-- Popular: 2000 coins for 19.99€ (+ 50 bonus)
UPDATE public.swapcoins_packages
SET coins = 2000, updated_at = now()
WHERE name = 'Popular';

-- Premium: 3500 coins for 34.99€ (+ 150 bonus)
UPDATE public.swapcoins_packages
SET coins = 3500, updated_at = now()
WHERE name = 'Premium';

-- Ultimate: 7500 coins for 74.99€ (+ 500 bonus)
UPDATE public.swapcoins_packages
SET coins = 7500, updated_at = now()
WHERE name = 'Ultimate';
