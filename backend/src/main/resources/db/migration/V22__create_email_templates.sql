-- Create email templates system with visual themes

-- Email template themes (visual designs)
CREATE TABLE IF NOT EXISTS email_template_themes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    html_structure TEXT NOT NULL, -- Base HTML structure with placeholders
    css_styles TEXT NOT NULL, -- CSS for the theme
    is_system BOOLEAN NOT NULL DEFAULT false, -- System themes can't be deleted
    user_id BIGINT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_email_template_themes_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Email templates (content templates)
CREATE TABLE IF NOT EXISTS email_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general', -- newsletter, follow-up, welcome, promotional, etc.
    subject VARCHAR(500) NOT NULL,
    preview_text VARCHAR(200), -- Email preview text
    theme_id BIGINT,
    html_content TEXT NOT NULL, -- Full HTML content
    plain_text_content TEXT, -- Plain text version
    variables JSONB, -- Available variables like {{firstName}}, {{company}}
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    usage_count INTEGER NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_email_templates_theme FOREIGN KEY (theme_id) REFERENCES email_template_themes(id) ON DELETE SET NULL,
    CONSTRAINT fk_email_templates_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Add template reference to sequence_steps
ALTER TABLE sequence_steps ADD COLUMN IF NOT EXISTS template_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT constraint_name FROM information_schema.table_constraints
        WHERE table_name = 'sequence_steps' AND constraint_name = 'fk_sequence_steps_template'
    ) THEN
        ALTER TABLE sequence_steps ADD CONSTRAINT fk_sequence_steps_template
            FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_theme_id ON email_templates(theme_id);
CREATE INDEX IF NOT EXISTS idx_email_template_themes_user_id ON email_template_themes(user_id);

-- Insert system themes (only if not already present)
INSERT INTO email_template_themes (name, description, html_structure, css_styles, is_system, created_at, updated_at) VALUES
('Modern Professional', 'Clean and professional design with blue accents', 
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
        <div class="content">
            {{CONTENT}}
        </div>
        <div class="footer">
            {{FOOTER}}
        </div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
.logo { color: #ffffff; font-size: 24px; font-weight: bold; }
.content { padding: 40px 30px; color: #333333; line-height: 1.6; }
.footer { background-color: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 12px; color: #666666; }
h1 { color: #667eea; margin-top: 0; }
.button { display: inline-block; padding: 12px 30px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }',
true, NOW(), NOW()),

('Minimalist', 'Simple and elegant design with maximum readability',
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>{{CSS_STYLES}}</style>
</head>
<body>
    <div class="email-container">
        <div class="header">{{LOGO}}</div>
        <div class="content">{{CONTENT}}</div>
        <div class="footer">{{FOOTER}}</div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; background-color: #ffffff; }
.email-container { max-width: 600px; margin: 40px auto; padding: 0 20px; }
.header { padding: 20px 0; border-bottom: 2px solid #000000; margin-bottom: 30px; }
.logo { font-size: 20px; font-weight: 600; color: #000000; }
.content { padding: 20px 0; color: #000000; line-height: 1.8; font-size: 16px; }
.footer { padding: 20px 0; border-top: 1px solid #e0e0e0; margin-top: 30px; font-size: 14px; color: #666666; }
h1 { font-size: 28px; font-weight: 300; margin: 0 0 20px 0; }
.button { display: inline-block; padding: 14px 40px; background-color: #000000; color: #ffffff; text-decoration: none; margin: 20px 0; }',
true, NOW(), NOW()),

('Corporate Blue', 'Professional corporate design with blue theme',
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
'body { margin: 0; padding: 0; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background-color: #e8f0f7; }
.email-wrapper { padding: 20px; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.header { background-color: #0066cc; padding: 25px 30px; }
.logo { color: #ffffff; font-size: 22px; font-weight: bold; }
.content { padding: 35px 30px; color: #333333; line-height: 1.7; }
.footer { background-color: #f5f5f5; padding: 20px 30px; text-align: center; font-size: 13px; color: #666666; border-top: 3px solid #0066cc; }
h1 { color: #0066cc; font-size: 26px; margin-top: 0; }
.button { display: inline-block; padding: 12px 35px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 3px; margin: 20px 0; font-weight: 600; }',
true, NOW(), NOW()),

('Newsletter Modern', 'Eye-catching design perfect for newsletters',
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
            <div class="tagline">{{TAGLINE}}</div>
        </div>
        <div class="hero">{{HERO_IMAGE}}</div>
        <div class="content">{{CONTENT}}</div>
        <div class="cta-section">{{CTA}}</div>
        <div class="footer">{{FOOTER}}</div>
    </div>
</body>
</html>',
'body { margin: 0; padding: 0; font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f9fafb; }
.email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; }
.header { background: linear-gradient(to right, #f093fb 0%, #f5576c 100%); padding: 25px 30px; text-align: center; }
.logo { color: #ffffff; font-size: 26px; font-weight: 700; margin-bottom: 5px; }
.tagline { color: #ffffff; font-size: 14px; opacity: 0.9; }
.hero { width: 100%; height: 250px; background-color: #e5e7eb; display: flex; align-items: center; justify-content: center; }
.content { padding: 40px 35px; color: #374151; line-height: 1.7; }
.cta-section { padding: 30px; text-align: center; background-color: #fef3c7; }
.footer { background-color: #1f2937; padding: 25px 30px; text-align: center; color: #9ca3af; font-size: 13px; }
h1 { color: #111827; font-size: 28px; margin: 0 0 15px 0; }
h2 { color: #f5576c; font-size: 22px; margin: 25px 0 15px 0; }
.button { display: inline-block; padding: 14px 40px; background: linear-gradient(to right, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; border-radius: 25px; margin: 15px 0; font-weight: 600; box-shadow: 0 4px 6px rgba(245, 87, 108, 0.3); }',
true, NOW(), NOW());

-- Insert sample templates
INSERT INTO email_templates (name, description, category, subject, preview_text, theme_id, html_content, plain_text_content, variables, user_id, created_at, updated_at) VALUES
('Welcome Email', 'Welcome new contacts to your service', 'welcome', 
'Welcome to {{companyName}}, {{firstName}}!', 
'We''re excited to have you on board',
1,
'<h1>Welcome, {{firstName}}!</h1>
<p>We''re thrilled to have you join {{companyName}}. Our team is dedicated to helping you succeed.</p>
<p>Here''s what you can expect:</p>
<ul>
    <li>Personalized support from our team</li>
    <li>Regular updates and insights</li>
    <li>Access to exclusive resources</li>
</ul>
<a href="{{dashboardUrl}}" class="button">Get Started</a>
<p>If you have any questions, feel free to reach out!</p>',
'Welcome, {{firstName}}!

We''re thrilled to have you join {{companyName}}. Our team is dedicated to helping you succeed.

Get Started: {{dashboardUrl}}',
'{"firstName": "Contact first name", "companyName": "Your company name", "dashboardUrl": "Dashboard URL"}'::jsonb,
1, NOW(), NOW()),

('Follow-up Email', 'Professional follow-up template', 'follow-up',
'Following up on our conversation, {{firstName}}',
'I wanted to reach out regarding our discussion',
2,
'<h1>Hi {{firstName}},</h1>
<p>I hope this email finds you well. I wanted to follow up on our recent conversation about {{topic}}.</p>
<p>As discussed, I believe {{companyName}} can help you achieve:</p>
<ul>
    <li>{{benefit1}}</li>
    <li>{{benefit2}}</li>
    <li>{{benefit3}}</li>
</ul>
<p>Would you be available for a quick call this week to discuss next steps?</p>
<a href="{{calendarLink}}" class="button">Schedule a Call</a>',
'Hi {{firstName}},

I hope this email finds you well. I wanted to follow up on our recent conversation about {{topic}}.

Schedule a call: {{calendarLink}}',
'{"firstName": "Contact first name", "topic": "Discussion topic", "companyName": "Your company", "benefit1": "First benefit", "benefit2": "Second benefit", "benefit3": "Third benefit", "calendarLink": "Calendar booking link"}'::jsonb,
1, NOW(), NOW()),

('Monthly Newsletter', 'Engaging monthly newsletter template', 'newsletter',
'{{companyName}} Newsletter - {{month}} {{year}}',
'Your monthly update is here!',
4,
'<h1>{{month}} Newsletter</h1>
<p>Hello {{firstName}},</p>
<p>Welcome to this month''s edition of our newsletter! Here''s what''s new:</p>

<h2>🎯 Featured Article</h2>
<p>{{featuredArticleTitle}}</p>
<p>{{featuredArticleExcerpt}}</p>
<a href="{{featuredArticleUrl}}" class="button">Read More</a>

<h2>📊 Latest Updates</h2>
<ul>
    <li>{{update1}}</li>
    <li>{{update2}}</li>
    <li>{{update3}}</li>
</ul>

<h2>💡 Quick Tip</h2>
<p>{{quickTip}}</p>

<p>Stay tuned for more updates next month!</p>',
'{{month}} Newsletter

Hello {{firstName}},

Featured Article: {{featuredArticleTitle}}
Read more: {{featuredArticleUrl}}

Latest Updates:
- {{update1}}
- {{update2}}
- {{update3}}

Quick Tip: {{quickTip}}',
'{"firstName": "Contact first name", "month": "Current month", "year": "Current year", "companyName": "Your company", "featuredArticleTitle": "Article title", "featuredArticleExcerpt": "Article excerpt", "featuredArticleUrl": "Article URL", "update1": "First update", "update2": "Second update", "update3": "Third update", "quickTip": "Helpful tip"}'::jsonb,
1, NOW(), NOW());

-- Add comments
COMMENT ON TABLE email_template_themes IS 'Visual themes/designs for email templates';
COMMENT ON TABLE email_templates IS 'Reusable email templates with content';
COMMENT ON COLUMN email_templates.variables IS 'JSON object defining available template variables';
COMMENT ON COLUMN email_templates.category IS 'Template category: newsletter, follow-up, welcome, promotional, etc.';