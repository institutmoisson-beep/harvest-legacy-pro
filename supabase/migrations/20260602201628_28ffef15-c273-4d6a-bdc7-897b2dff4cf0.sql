INSERT INTO public.moisson_projects (title, category, description, global_target, share_price, total_shares, shares_sold, estimated_roi, start_date, end_date, status, cover_image)
VALUES
('Bénédiction d''Abidjan — Long-métrage', 'cinema',
 'Long-métrage panafricain produit par le GIE Institut Moisson. Tournage prévu à Abidjan, Dakar et Lagos. Distribution cinéma + plateformes VOD continentales. Casting confirmé, réalisateur primé en festival.',
 25000000, 10000, 2500, 312, 28, NOW(), NOW() + INTERVAL '60 days', 'collecte', '/moisson/cinema-africain.jpg'),
('Champs de Manioc & Maïs — GIE Moisson Agro', 'agrobusiness',
 'Exploitation de 40 hectares de manioc et maïs irrigués au sud de la Côte d''Ivoire. Transformation locale (gari, attiéké, farine) et commercialisation via le réseau marchand de l''Institut. Deux cycles de récolte par an.',
 15000000, 5000, 3000, 1200, 22, NOW(), NOW() + INTERVAL '45 days', 'collecte', '/moisson/agrobusiness-manioc.jpg');