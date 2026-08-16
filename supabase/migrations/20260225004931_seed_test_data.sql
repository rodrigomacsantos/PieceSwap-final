-- Seed data for testing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    user1_id UUID := gen_random_uuid();
    user2_id UUID := gen_random_uuid();
    user3_id UUID := gen_random_uuid();
    user4_id UUID := gen_random_uuid();
    user5_id UUID := gen_random_uuid();
    password_hash TEXT := crypt('password123', gen_salt('bf'));
BEGIN
    -- Insert Users into auth.users
    -- João Silva
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (user1_id, 'joao.silva@example.com', password_hash, now(), '{"full_name": "João Silva", "username": "joaosilva88", "avatar_url": "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop"}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');

    -- Maria Santos
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (user2_id, 'maria.santos@example.com', password_hash, now(), '{"full_name": "Maria Santos", "username": "mariag_lego", "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');

    -- Pedro Oliveira
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (user3_id, 'pedro.oliveira@example.com', password_hash, now(), '{"full_name": "Pedro Oliveira", "username": "pedro_starwars", "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');

    -- Ana Costa
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (user4_id, 'ana.costa@example.com', password_hash, now(), '{"full_name": "Ana Costa", "username": "ana_bricks", "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop"}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');

    -- Ricardo Pereira
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (user5_id, 'ricardo.pereira@example.com', password_hash, now(), '{"full_name": "Ricardo Pereira", "username": "ricardo_expert", "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');

    -- Update profiles with bio and location (trigger handled name/username/avatar)
    UPDATE public.profiles SET bio = 'Colecionador de LEGO Technic desde 2010. Sempre à procura de novos desafios.', location = 'Lisboa' WHERE id = user1_id;
    UPDATE public.profiles SET bio = 'Adoro sets de Architecture e Ideas. A minha sala é uma mini-cidade LEGO!', location = 'Porto' WHERE id = user2_id;
    UPDATE public.profiles SET bio = 'Fã incondicional de Star Wars. Que a força esteja com os teus bricks.', location = 'Coimbra' WHERE id = user3_id;
    UPDATE public.profiles SET bio = 'Entusiasta de LEGO Friends e City. Gosto de construir mundos coloridos.', location = 'Braga' WHERE id = user4_id;
    UPDATE public.profiles SET bio = 'Focado em sets Creator Expert e edições limitadas. Troco apenas por itens raros.', location = 'Faro' WHERE id = user5_id;

    -- Insert Listings
    -- João Silva's Listings
    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user1_id, 'LEGO Technic Lamborghini Sián FKP 37 (42115)', 'Modelo incrível e detalhado em escala 1:8. Novo em folha.', 'Technic', 'Novo (Selado)', 300, 2500, true, ARRAY['https://images.unsplash.com/photo-1589133513705-58a3ad62419c?w=800']);

    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user1_id, 'LEGO Technic Bugatti Chiron (42083)', 'Montado uma vez para exibição. Inclui caixa original e manuais.', 'Technic', 'Como Novo', 280, 2300, true, ARRAY['https://images.unsplash.com/photo-1517055729445-fa7d27394b48?w=800']);

    -- Maria Santos's Listings
    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user2_id, 'LEGO Architecture Paris (21044)', 'Skyline de Paris com a Torre Eiffel e Arco do Triunfo.', 'Architecture', 'Usado (Completo)', 45, 400, true, ARRAY['https://images.unsplash.com/photo-1549492423-400259a2e574?w=800']);

    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user2_id, 'LEGO Ideas Central Perk (21319)', 'Set icónico da série Friends. Nunca aberto.', 'Ideas', 'Novo (Selado)', 60, 500, true, ARRAY['https://images.unsplash.com/photo-1611604548018-d56bbd85d681?w=800']);

    -- Pedro Oliveira's Listings
    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user3_id, 'LEGO Star Wars Millennium Falcon (75257)', 'A nave mais famosa da galáxia. Ideal para colecionadores.', 'Star Wars', 'Novo (Selado)', 140, 1200, true, ARRAY['https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=800']);

    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user3_id, 'LEGO Star Wars Imperial Star Destroyer (75252)', 'Set UCS massivo. Uma peça central para qualquer fã de Star Wars.', 'Star Wars', 'Novo (Selado)', 650, 5000, true, ARRAY['https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800']);

    -- Ana Costa's Listings
    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user4_id, 'LEGO City Police Station (60316)', 'Esquadra de polícia completa com veículos e minifiguras.', 'City', 'Como Novo', 55, 450, true, ARRAY['https://images.unsplash.com/photo-1560113562-a0a37ada6d91?w=800']);

    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user4_id, 'LEGO Friends Main Street Building (41704)', 'Grande edifício modular com várias lojas e apartamentos.', 'Friends', 'Usado (Completo)', 120, 1000, true, ARRAY['https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800']);

    -- Ricardo Pereira's Listings
    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user5_id, 'LEGO Creator Expert Assembly Square (10255)', 'Set comemorativo de 10 anos de modulares. Muito detalhado.', 'Creator Expert', 'Novo (Selado)', 240, 2000, true, ARRAY['https://images.unsplash.com/photo-1632304529453-f9338ac1c3e2?w=800']);

    INSERT INTO public.listings (user_id, title, description, category, condition, price_eur, price_swap_coins, accepts_trades, images)
    VALUES (user5_id, 'LEGO Creator Expert Bookshop (10270)', 'Livraria e casa de estilo europeu. Lindo em qualquer prateleira.', 'Creator Expert', 'Novo (Selado)', 160, 1400, true, ARRAY['https://images.unsplash.com/photo-1644175897056-50f4d3a9a827?w=800']);

END $$;
