-- Update existing default tags to Polish names
UPDATE tags SET name = 'Klienci' WHERE name = 'Customer';
UPDATE tags SET name = 'Zimny Lead' WHERE name = 'Cold Lead';
UPDATE tags SET name = 'Gorący Lead' WHERE name = 'Hot Lead';

-- Insert additional Polish tags if they don't exist
INSERT INTO tags (name, color) VALUES
    ('Partnerzy', '#10b981'), -- Green
    ('Newsletter', '#8b5cf6'), -- Purple
    ('Windykacja', '#6b7280'), -- Gray
    ('Nauka', '#06b6d4'), -- Cyan
    ('Dostawcy', '#84cc16') -- Lime
ON CONFLICT (name) DO NOTHING;