-- Add more professional email themes

INSERT INTO email_template_themes (name, description, html_structure, css_styles, is_system, created_at, updated_at) VALUES

-- Dark Elegant Theme
('Dark Elegant', 'Elegancki ciemny motyw z subtelnymi akcentami złota',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <div class="logo">{{LOGO}}</div>
            </div>
            <div class="content">{{CONTENT}}</div>
            <div class="footer">{{FOOTER}}</div>
        </div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: "Georgia", serif; background-color: #1a1a2e; }
.email-wrapper { padding: 30px 20px; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #16213e; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
.header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 35px 30px; text-align: center; border-bottom: 2px solid #d4af37; }
.logo { color: #d4af37; font-size: 28px; font-weight: bold; letter-spacing: 2px; }
.content { padding: 40px 35px; color: #e8e8e8; line-height: 1.8; font-size: 16px; }
.footer { background-color: #0f0f1a; padding: 25px 30px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #333; }
h1 { color: #d4af37; font-size: 26px; margin: 0 0 20px 0; font-weight: 400; }
h2 { color: #ffffff; font-size: 20px; margin: 25px 0 15px 0; }
p { color: #cccccc; }
a { color: #d4af37; }
.button { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #d4af37 0%, #c9a227 100%); color: #1a1a2e; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }',
true, NOW(), NOW()),

-- Startup Fresh Theme
('Startup Fresh', 'Nowoczesny, świeży design dla startupów i firm technologicznych',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">{{LOGO}}</div>
        </div>
        <div class="content">{{CONTENT}}</div>
        <div class="social-section">{{SOCIAL}}</div>
        <div class="footer">{{FOOTER}}</div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f0fdf4; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
.header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; }
.logo { color: #ffffff; font-size: 26px; font-weight: 700; }
.content { padding: 40px 35px; color: #1f2937; line-height: 1.7; }
.social-section { padding: 25px; background-color: #f0fdf4; text-align: center; }
.footer { background-color: #065f46; padding: 25px 30px; text-align: center; font-size: 13px; color: #a7f3d0; }
h1 { color: #065f46; font-size: 28px; margin: 0 0 15px 0; }
h2 { color: #10b981; font-size: 22px; margin: 25px 0 12px 0; }
.button { display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); }
.highlight { background-color: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }',
true, NOW(), NOW()),

-- Gradient Sunset Theme
('Gradient Sunset', 'Ciepły gradient zachodzącego słońca - idealny dla kreatywnych branż',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <div class="logo">{{LOGO}}</div>
                <div class="subtitle">{{TAGLINE}}</div>
            </div>
            <div class="content">{{CONTENT}}</div>
            <div class="footer">{{FOOTER}}</div>
        </div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: "Poppins", "Segoe UI", sans-serif; background: linear-gradient(180deg, #ffecd2 0%, #fcb69f 100%); min-height: 100vh; }
.email-wrapper { padding: 30px 20px; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(252, 182, 159, 0.4); }
.header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #f8b500 100%); padding: 40px 30px; text-align: center; }
.logo { color: #ffffff; font-size: 30px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.subtitle { color: rgba(255,255,255,0.9); font-size: 14px; margin-top: 8px; }
.content { padding: 40px 35px; color: #4a4a4a; line-height: 1.8; }
.footer { background: linear-gradient(135deg, #f5f5f5 0%, #ececec 100%); padding: 25px 30px; text-align: center; font-size: 13px; color: #888888; }
h1 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 28px; margin: 0 0 20px 0; }
h2 { color: #f5576c; font-size: 22px; }
.button { display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; border-radius: 30px; margin: 20px 0; font-weight: 600; box-shadow: 0 6px 20px rgba(245, 87, 108, 0.4); }',
true, NOW(), NOW()),

-- Clean Business Theme
('Clean Business', 'Czysty, profesjonalny motyw dla korespondencji biznesowej',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">{{LOGO}}</div>
        </div>
        <div class="divider"></div>
        <div class="content">{{CONTENT}}</div>
        <div class="signature">{{SIGNATURE}}</div>
        <div class="footer">{{FOOTER}}</div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 20px; font-family: "Helvetica Neue", Arial, sans-serif; background-color: #f8f9fa; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e9ecef; }
.header { padding: 30px 35px 20px; }
.logo { font-size: 22px; font-weight: 600; color: #212529; }
.divider { height: 3px; background: linear-gradient(to right, #4f46e5, #7c3aed); margin: 0 35px; }
.content { padding: 35px; color: #495057; line-height: 1.7; font-size: 15px; }
.signature { padding: 0 35px 30px; border-top: 1px solid #e9ecef; margin-top: 20px; padding-top: 25px; }
.footer { background-color: #f8f9fa; padding: 20px 35px; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef; }
h1 { color: #212529; font-size: 24px; margin: 0 0 20px 0; font-weight: 600; }
h2 { color: #4f46e5; font-size: 18px; margin: 20px 0 10px 0; }
.button { display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 15px 0; font-weight: 500; }
.button:hover { background-color: #4338ca; }
ul { padding-left: 20px; }
li { margin-bottom: 8px; }',
true, NOW(), NOW()),

-- Tech Neon Theme
('Tech Neon', 'Futurystyczny motyw z neonowymi akcentami dla branży tech',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <div class="logo">{{LOGO}}</div>
            </div>
            <div class="content">{{CONTENT}}</div>
            <div class="cta-box">{{CTA}}</div>
            <div class="footer">{{FOOTER}}</div>
        </div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: "JetBrains Mono", "Fira Code", monospace; background-color: #0a0a0f; }
.email-wrapper { padding: 30px 20px; background: linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%); }
.email-container { max-width: 600px; margin: 0 auto; background-color: #12121a; border: 1px solid #2d2d44; border-radius: 12px; overflow: hidden; }
.header { background: linear-gradient(135deg, #12121a 0%, #1e1e2e 100%); padding: 35px 30px; text-align: center; border-bottom: 1px solid #00ff88; }
.logo { color: #00ff88; font-size: 24px; font-weight: 700; text-shadow: 0 0 20px rgba(0, 255, 136, 0.5); letter-spacing: 3px; }
.content { padding: 40px 35px; color: #b8b8c8; line-height: 1.8; }
.cta-box { margin: 0 35px 30px; padding: 25px; background: linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 200, 255, 0.1) 100%); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 8px; text-align: center; }
.footer { background-color: #0a0a0f; padding: 25px 30px; text-align: center; font-size: 11px; color: #5a5a7a; border-top: 1px solid #2d2d44; }
h1 { color: #ffffff; font-size: 26px; margin: 0 0 20px 0; }
h2 { color: #00ff88; font-size: 18px; margin: 25px 0 12px 0; text-transform: uppercase; letter-spacing: 2px; }
p { color: #a0a0b8; }
a { color: #00c8ff; }
.button { display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #00ff88 0%, #00c8ff 100%); color: #0a0a0f; text-decoration: none; border-radius: 6px; margin: 15px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 25px rgba(0, 255, 136, 0.4); }
code { background-color: #1e1e2e; padding: 2px 8px; border-radius: 4px; color: #00ff88; font-size: 14px; }',
true, NOW(), NOW()),

-- Soft Pastel Theme
('Soft Pastel', 'Delikatny pastelowy motyw - idealny dla lifestyle i wellness',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">{{LOGO}}</div>
        </div>
        <div class="content">{{CONTENT}}</div>
        <div class="quote-box">{{QUOTE}}</div>
        <div class="footer">{{FOOTER}}</div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 25px; font-family: "Quicksand", "Nunito", sans-serif; background: linear-gradient(135deg, #ffeef8 0%, #f0f4ff 50%, #e8fff8 100%); }
.email-container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }
.header { background: linear-gradient(135deg, #ffd6e8 0%, #c1e1ff 100%); padding: 35px 30px; text-align: center; }
.logo { color: #6b5b7a; font-size: 26px; font-weight: 700; }
.content { padding: 40px 35px; color: #5a5a6e; line-height: 1.85; font-size: 15px; }
.quote-box { margin: 0 35px 30px; padding: 25px; background: linear-gradient(135deg, #fff5f8 0%, #f8f5ff 100%); border-radius: 15px; text-align: center; font-style: italic; color: #8b7a9e; }
.footer { background-color: #fafbff; padding: 25px 30px; text-align: center; font-size: 12px; color: #9a9ab0; }
h1 { color: #6b5b7a; font-size: 26px; margin: 0 0 20px 0; font-weight: 600; }
h2 { color: #9b8aa8; font-size: 20px; margin: 25px 0 12px 0; }
.button { display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #ffd6e8 0%, #c1e1ff 100%); color: #6b5b7a; text-decoration: none; border-radius: 30px; margin: 20px 0; font-weight: 600; box-shadow: 0 4px 15px rgba(193, 225, 255, 0.5); }
.highlight { background-color: #fff5f8; padding: 15px 20px; border-radius: 10px; border-left: 3px solid #ffd6e8; margin: 15px 0; }',
true, NOW(), NOW()),

-- Bold Impact Theme
('Bold Impact', 'Odważny, kontrastowy motyw dla mocnych komunikatów',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="header">
                <div class="logo">{{LOGO}}</div>
            </div>
            <div class="hero-text">{{HERO}}</div>
            <div class="content">{{CONTENT}}</div>
            <div class="footer">{{FOOTER}}</div>
        </div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: "Oswald", "Impact", sans-serif; background-color: #000000; }
.email-wrapper { padding: 25px; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
.header { background-color: #ff3366; padding: 25px 30px; }
.logo { color: #ffffff; font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 4px; }
.hero-text { background-color: #000000; padding: 50px 35px; text-align: center; }
.hero-text h1 { color: #ffffff; font-size: 42px; margin: 0; text-transform: uppercase; letter-spacing: 3px; line-height: 1.2; }
.content { padding: 40px 35px; color: #333333; line-height: 1.7; font-family: "Roboto", Arial, sans-serif; }
.footer { background-color: #1a1a1a; padding: 25px 30px; text-align: center; font-size: 12px; color: #888888; }
h2 { color: #ff3366; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; margin: 25px 0 15px 0; font-family: "Oswald", sans-serif; }
.button { display: inline-block; padding: 16px 45px; background-color: #ff3366; color: #ffffff; text-decoration: none; margin: 20px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-family: "Oswald", sans-serif; }
.button:hover { background-color: #e6004d; }
.accent-box { background-color: #ff3366; color: #ffffff; padding: 25px; margin: 20px 0; }',
true, NOW(), NOW()),

-- E-commerce Pro Theme
('E-commerce Pro', 'Profesjonalny motyw dla sklepów online i ofert produktowych',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">{{LOGO}}</div>
            <div class="nav">{{NAV}}</div>
        </div>
        <div class="promo-banner">{{PROMO}}</div>
        <div class="content">{{CONTENT}}</div>
        <div class="products-grid">{{PRODUCTS}}</div>
        <div class="footer">{{FOOTER}}</div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: "Lato", "Open Sans", sans-serif; background-color: #f5f5f5; }
.email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; background-color: #ffffff; border-bottom: 1px solid #eeeeee; }
.logo { font-size: 24px; font-weight: 700; color: #2d3436; }
.nav { font-size: 13px; color: #636e72; }
.nav a { color: #636e72; text-decoration: none; margin-left: 20px; }
.promo-banner { background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); padding: 30px; text-align: center; color: #ffffff; }
.promo-banner h2 { margin: 0; font-size: 28px; font-weight: 800; }
.promo-banner p { margin: 10px 0 0; font-size: 16px; opacity: 0.9; }
.content { padding: 35px 30px; color: #2d3436; line-height: 1.7; }
.products-grid { padding: 0 30px 30px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.product-card { border: 1px solid #eeeeee; border-radius: 8px; overflow: hidden; text-align: center; }
.product-card img { width: 100%; height: 150px; object-fit: cover; background: #f8f9fa; }
.product-card h4 { margin: 15px 0 5px; font-size: 14px; color: #2d3436; }
.product-card .price { color: #6c5ce7; font-weight: 700; font-size: 18px; }
.footer { background-color: #2d3436; padding: 30px; text-align: center; color: #b2bec3; font-size: 13px; }
h1 { color: #2d3436; font-size: 26px; margin: 0 0 15px 0; }
.button { display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); color: #ffffff; text-decoration: none; border-radius: 25px; margin: 15px 0; font-weight: 600; }
.sale-tag { display: inline-block; background-color: #ff7675; color: #ffffff; padding: 4px 10px; border-radius: 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; }',
true, NOW(), NOW());

-- Add helpful comment
COMMENT ON TABLE email_template_themes IS 'Visual themes/designs for email templates. System themes cannot be deleted by users.';

