-- Insert Products into Supabase Database
-- Run this in Supabase SQL Editor if CSV import doesn't work

INSERT INTO products (name, category, description, image_url, variants, tag, rating, active) VALUES
('Tomato Pickle', 'Veg', 'Homestyle Andhra-style tomato pickle with balanced tang and spice.', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=600&auto=format&fit=crop', 
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb, 
 'Veg', 4.5, true),

('Mango Pickle', 'Veg', 'Classic mango pickle with traditional spices and cold-pressed oil.', 'https://images.unsplash.com/photo-1598514983088-d446927dfb3d?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb,
 'Veg', 5.0, true),

('Lemon Pickle', 'Veg', 'Tangy and spicy lemon pickle that goes well with rice and curd.', 'https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb,
 'Veg', 4.5, true),

('Tamarind Pickle', 'Veg', 'Rich tamarind pickle with a deep, tangy flavour.', 'https://images.unsplash.com/photo-1588190335456-1666e4ac2a14?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb,
 'Veg', 4.5, true),

('Gongura Pickle', 'Veg', 'Authentic gongura (sorrel leaves) pickle with bold Andhra flavours.', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb,
 'Veg', 5.0, true),

('Usirikaya (Gooseberry) Pickle', 'Veg', 'Healthy gooseberry pickle rich in Vitamin C and flavour.', 'https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb,
 'Veg', 4.5, true),

('Cauliflower Pickle', 'Veg', 'Crunchy cauliflower pickle with homemade masala.', 'https://images.unsplash.com/photo-1584270354949-c26b0fd8f13b?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 150}, {"label": "500 g", "weight": "500 g", "price": 250}, {"label": "1 kg", "weight": "1 kg", "price": 500}]'::jsonb,
 'Veg', 4.5, true),

('Kakarakaya Podi', 'Veg', 'Bitter gourd spice podi, perfect with hot rice and ghee.', 'https://images.unsplash.com/photo-1615937691194-96f162e8b09a?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 250}, {"label": "600 g", "weight": "600 g", "price": 500}, {"label": "1 kg", "weight": "1 kg", "price": 1000}]'::jsonb,
 'Podi', 4.5, true),

('Drumstick Pickle', 'Veg', 'Unique drumstick pickle with home-style masala.', 'https://images.unsplash.com/photo-1613274921513-4cf245073a4d?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 270}, {"label": "600 g", "weight": "600 g", "price": 550}]'::jsonb,
 'Veg', 4.5, true),

('Chicken Pickle', 'Non Veg', 'Spicy Andhra-style chicken pickle, ready-to-eat with rice or rotis.', 'https://images.unsplash.com/photo-1604908176997-1251884b08a5?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 250}, {"label": "500 g", "weight": "500 g", "price": 450}, {"label": "1 kg", "weight": "1 kg", "price": 900}]'::jsonb,
 'Non Veg', 5.0, true),

('Mutton Pickle', 'Non Veg', 'Rich and spicy mutton pickle for true meat lovers.', 'https://images.unsplash.com/photo-1604908176997-1251884b08a5?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 500}, {"label": "500 g", "weight": "500 g", "price": 1000}, {"label": "1 kg", "weight": "1 kg", "price": 2000}]'::jsonb,
 'Non Veg', 5.0, true),

('Fish Pickle', 'Non Veg', 'Coastal style fish pickle with bold spices and tang.', 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 600}, {"label": "500 g", "weight": "500 g", "price": 1200}]'::jsonb,
 'Non Veg', 4.5, true),

('Prawn Pickle', 'Non Veg', 'Juicy prawn pickle with a perfect balance of spice and flavour.', 'https://images.unsplash.com/photo-1604908553954-0014f028ec5f?q=80&w=600&auto=format&fit=crop',
 '[{"label": "250 g", "weight": "250 g", "price": 650}, {"label": "500 g", "weight": "500 g", "price": 1300}]'::jsonb,
 'Non Veg', 4.5, true);

-- Verify products were inserted
SELECT COUNT(*) as total_products FROM products WHERE active = true;