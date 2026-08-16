-- Add swapcoins column to profiles table
ALTER TABLE "public"."profiles"
ADD COLUMN "swapcoins" integer DEFAULT 0;

-- Create products table for SwapCoin packages
CREATE TABLE "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "price_eur" integer,
    "swapcoins_amount" integer,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."products" OWNER TO "postgres";

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

-- Add price_swap_coins column to listings table
ALTER TABLE "public"."listings"
ADD COLUMN "price_swap_coins" integer;

-- Update existing listings to set price_swap_coins from price_eur
UPDATE "public"."listings"
SET "price_swap_coins" = "price_eur"
WHERE "price_eur" IS NOT NULL;

-- Add some sample products
INSERT INTO "public"."products" (name, price_eur, swapcoins_amount, image_url) VALUES
('500 SwapCoins', 5, 500, '/swapcoin-500.png'),
('1,200 SwapCoins', 10, 1200, '/swapcoin-1200.png'),
('2,500 SwapCoins', 20, 2500, '/swapcoin-2500.png'),
('7,000 SwapCoins', 50, 7000, '/swapcoin-7000.png');
