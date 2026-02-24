-- database-schema.sql
-- قاعدة البيانات الكاملة لموقع د. سارة

-- ===================================
-- 1. جدول المستخدمين (Admins)
-- ===================================
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admins (email, password_hash, full_name, role) 
VALUES (
    'dr.sara@example.com',
    '$2b$10$NPJPKA16HjmuhWSanXyjZ.kpr4GYAYZ4HuOCfa6FnaGK2CxVJokfi',
    'د. سارة',
    'super_admin'
);

-- Admin Password: Admin@123

-- ===================================
-- 2. جدول التصنيفات (Categories)
-- ===================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- تصنيفات افتراضية
INSERT INTO categories (name_ar, name_en, slug, display_order) VALUES
('كتب', 'Books', 'books', 1),
('كورسات', 'Courses', 'courses', 2),
('استشارات', 'Consultations', 'consultations', 3),
('باقات مجمعة', 'Bundles', 'bundles', 4);

-- ===================================
-- 3. جدول المنتجات (Products)
-- ===================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    
    -- معلومات أساسية
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    
    -- الأسعار
    price DECIMAL(10, 2) NOT NULL,
    sale_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2), -- تكلفة الإنتاج (خاص)
    
    -- الوصف
    short_description TEXT,
    description TEXT,
    
    -- المخزون
    stock_quantity INT DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    track_inventory BOOLEAN DEFAULT true,
    allow_backorder BOOLEAN DEFAULT false,
    low_stock_threshold INT DEFAULT 5,
    
    -- الحالة
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, out_of_stock
    is_featured BOOLEAN DEFAULT false,
    is_digital BOOLEAN DEFAULT false, -- منتج رقمي أم مادي
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- الصور (JSON array of URLs)
    images JSONB DEFAULT '[]',
    
    -- معلومات إضافية
    weight DECIMAL(8, 2), -- بالكيلوجرام
    dimensions JSONB, -- {length, width, height}
    
    -- التواريخ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

-- إنشاء indexes للبحث السريع
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_sku ON products(sku);

-- ===================================
-- 4. جدول العملاء (Customers)
-- ===================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    
    -- الاسم
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- العنوان الافتراضي
    default_address JSONB, -- {street, city, postal_code, country}
    
    -- إحصائيات
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0,
    
    -- التواريخ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_order_at TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ===================================
-- 5. جدول الطلبات (Orders)
-- ===================================
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    
    -- معلومات العميل (نسخة في حال حذف العميل)
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_name VARCHAR(255) NOT NULL,
    
    -- العنوان
    shipping_address JSONB NOT NULL, -- {first_name, last_name, street, city, postal_code, country, phone}
    billing_address JSONB,
    
    -- المبالغ
    subtotal DECIMAL(10, 2) NOT NULL, -- مجموع المنتجات
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    
    -- كوبون الخصم
    coupon_code VARCHAR(50),
    
    -- الحالة
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled, refunded
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    
    -- الدفع
    payment_method VARCHAR(50), -- mada, visa, mastercard, applepay
    payment_gateway VARCHAR(50), -- moyasar, tap
    payment_transaction_id VARCHAR(255),
    paid_at TIMESTAMP,
    
    -- الشحن
    shipping_method VARCHAR(100), -- smsa, aramex, pickup
    shipping_company VARCHAR(100),
    tracking_number VARCHAR(255),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- ملاحظات
    customer_notes TEXT,
    admin_notes TEXT,
    
    -- التواريخ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ===================================
-- 6. جدول تفاصيل الطلبات (Order Items)
-- ===================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    
    -- معلومات المنتج وقت الشراء
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    product_image VARCHAR(500),
    
    -- السعر والكمية
    price DECIMAL(10, 2) NOT NULL, -- السعر وقت الشراء
    quantity INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL, -- price * quantity
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ===================================
-- 7. جدول كوبونات الخصم (Coupons)
-- ===================================
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- نوع الخصم
    discount_type VARCHAR(20) NOT NULL, -- percentage, fixed
    discount_value DECIMAL(10, 2) NOT NULL,
    
    -- الحد الأدنى للطلب
    minimum_order_amount DECIMAL(10, 2) DEFAULT 0,
    
    -- حد الاستخدام
    usage_limit INT, -- NULL = unlimited
    times_used INT DEFAULT 0,
    
    -- الصلاحية
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- الحالة
    is_active BOOLEAN DEFAULT true,
    
    -- التواريخ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active);

-- ===================================
-- 8. جدول سجل استخدام الكوبونات
-- ===================================
CREATE TABLE coupon_usage (
    id SERIAL PRIMARY KEY,
    coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- 9. جدول طرق الشحن (Shipping Methods)
-- ===================================
CREATE TABLE shipping_methods (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    company VARCHAR(100) NOT NULL, -- smsa, aramex, pickup
    
    -- السعر
    price DECIMAL(10, 2) DEFAULT 0,
    free_shipping_threshold DECIMAL(10, 2), -- شحن مجاني فوق مبلغ معين
    
    -- وقت التوصيل
    estimated_days_min INT,
    estimated_days_max INT,
    
    -- الحالة
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    
    -- API Configuration (JSON)
    api_config JSONB, -- {api_key, account_number, etc}
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- طرق شحن افتراضية
INSERT INTO shipping_methods (name_ar, name_en, company, price, estimated_days_min, estimated_days_max, display_order) VALUES
('شحن سمسا', 'SMSA Shipping', 'smsa', 25.00, 2, 4, 1),
('شحن أرامكس', 'Aramex Shipping', 'aramex', 30.00, 2, 5, 2),
('استلام من الفرع', 'Pickup', 'pickup', 0.00, 0, 0, 3);

-- ===================================
-- 10. جدول الإعدادات (Settings)
-- ===================================
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    value_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    group_name VARCHAR(50), -- general, payment, shipping, email
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إعدادات افتراضية
INSERT INTO settings (key, value, value_type, group_name, description) VALUES
('site_name', 'موقع د. سارة', 'string', 'general', 'اسم الموقع'),
('site_email', 'info@drsara.com', 'string', 'general', 'البريد الإلكتروني'),
('site_phone', '0500000000', 'string', 'general', 'رقم الهاتف'),
('currency', 'SAR', 'string', 'general', 'العملة'),
('tax_rate', '0.15', 'number', 'general', 'ضريبة القيمة المضافة (15%)'),
('moyasar_api_key', '', 'string', 'payment', 'Moyasar API Key'),
('moyasar_secret_key', '', 'string', 'payment', 'Moyasar Secret Key'),
('enable_stock_management', 'true', 'boolean', 'general', 'تفعيل إدارة المخزون'),
('low_stock_notification', 'true', 'boolean', 'general', 'إشعار عند انخفاض المخزون');

-- ===================================
-- 11. جدول سجل النشاطات (Activity Log)
-- ===================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES admins(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- created, updated, deleted
    entity_type VARCHAR(50) NOT NULL, -- product, order, customer, etc
    entity_id INT,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_admin ON activity_logs(admin_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- ===================================
-- 12. جدول التقارير المحفوظة (Saved Reports)
-- ===================================
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES admins(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- sales, products, customers
    filters JSONB, -- معايير التقرير
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- Views للتقارير السريعة
-- ===================================

-- View: إجمالي المبيعات
CREATE VIEW sales_summary AS
SELECT 
    COUNT(*) as total_orders,
    SUM(total) as total_revenue,
    SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END) as delivered_revenue,
    AVG(total) as average_order_value,
    DATE(created_at) as order_date
FROM orders
WHERE payment_status = 'paid'
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

-- View: أكثر المنتجات مبيعاً
CREATE VIEW top_selling_products AS
SELECT 
    p.id,
    p.name_ar,
    p.name_en,
    SUM(oi.quantity) as total_sold,
    SUM(oi.subtotal) as total_revenue,
    COUNT(DISTINCT oi.order_id) as number_of_orders
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.payment_status = 'paid'
GROUP BY p.id, p.name_ar, p.name_en
ORDER BY total_sold DESC;

-- View: إحصائيات العملاء
CREATE VIEW customer_stats AS
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    COUNT(o.id) as total_orders,
    SUM(o.total) as total_spent,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND o.payment_status = 'paid'
GROUP BY c.id, c.first_name, c.last_name, c.email
ORDER BY total_spent DESC;

-- ===================================
-- Functions & Triggers
-- ===================================

-- Function: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الـ trigger على الجداول
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: تحديث إحصائيات العميل عند إنشاء طلب
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'paid' THEN
        UPDATE customers
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total,
            last_order_at = NEW.created_at
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_trigger AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Function: تحديث المخزون عند إنشاء طلب
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id AND track_inventory = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_stock_trigger AFTER INSERT ON order_items
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- ===================================
-- تم! 🎉
-- ===================================

-- ===================================
-- طرق الشحن الكاملة لموقع د. سارة
-- ===================================
DELETE FROM shipping_methods; -- حذف القديمة

INSERT INTO shipping_methods (name_ar, name_en, company, price, free_shipping_threshold, estimated_days_min, estimated_days_max, display_order) VALUES
('شحن سمسا', 'SMSA Express', 'smsa', 25.00, 300.00, 2, 4, 1),
('شحن أرامكس', 'Aramex', 'aramex', 30.00, 350.00, 2, 5, 2),
('استلام من الفرع', 'Branch Pickup', 'pickup', 0.00, NULL, 0, 0, 3),
('أي مكان', 'Anymca', 'anymca', 22.00, 280.00, 2, 3, 4),
('ريد بوكس', 'Red Box', 'redbox', 20.00, 250.00, 1, 3, 5);

-- ===================================
-- جدول الحجوزات
-- ===================================
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_ref VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    session_type VARCHAR(50) NOT NULL,  -- online, inperson
    booking_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    consultation_topic TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, confirmed, completed, cancelled
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ===================================
-- جدول رسائل التواصل
-- ===================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    reply TEXT,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===================================
-- جدول المدونة
-- ===================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    title_ar VARCHAR(500) NOT NULL,
    excerpt_ar TEXT,
    content_ar TEXT NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    image_url VARCHAR(500),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',  -- draft, published
    author_id INT REFERENCES admins(id) ON DELETE SET NULL,
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts(status);
