// server.js - Backend API Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ===================================
// Database Connection
// ===================================
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'drsara_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

// ===================================
// Middleware
// ===================================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// File Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ===================================
// Auth Middleware
// ===================================
const authenticateToken = (req, res, next) => {
    // alias for convenience
    if (req.user) req.admin = req.user;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, admin) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.admin = admin;
        next();
    });
};

// ===================================
// AUTH ROUTES
// ===================================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            'SELECT * FROM admins WHERE email = $1 AND is_active = true',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = result.rows[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                full_name: admin.full_name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// PRODUCTS ROUTES
// ===================================

// Get all products (with filters)
app.get('/api/products', async (req, res) => {
    try {
        const { category, status, search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let baseQuery = `
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (category) {
            baseQuery += ` AND p.category_id = $${paramCount}`;
            params.push(category);
            paramCount++;
        }

        if (status) {
            baseQuery += ` AND p.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (search) {
            baseQuery += ` AND (p.name_ar ILIKE $${paramCount} OR p.name_en ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        let query = `SELECT p.*, c.name_ar as category_name
            ${baseQuery}
            ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        const countQuery = `SELECT COUNT(*) ${baseQuery}`;
        const countResult = await pool.query(countQuery, params.slice(0, -2));

        res.json({
            products: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT p.*, c.name_ar as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create product (Admin only)
app.post('/api/admin/products', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const {
            category_id, name_ar, name_en, price, sale_price,
            short_description, description, stock_quantity, sku,
            track_inventory, is_featured, is_digital, status
        } = req.body;

        // Process uploaded images
        const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const result = await pool.query(
            `INSERT INTO products (
                category_id, name_ar, name_en, price, sale_price,
                short_description, description, stock_quantity, sku,
                track_inventory, is_featured, is_digital, status, images
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                category_id, name_ar, name_en, price, sale_price,
                short_description, description, stock_quantity || 0, sku,
                track_inventory !== 'false', is_featured === 'true', is_digital === 'true',
                status || 'draft', JSON.stringify(images)
            ]
        );

        // Log activity
        await pool.query(
            'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
            [req.admin.id, 'created', 'product', result.rows[0].id, `Created product: ${name_ar}`]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Update product (Admin only)
app.put('/api/admin/products/:id', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category_id, name_ar, name_en, price, sale_price,
            short_description, description, stock_quantity, sku,
            track_inventory, is_featured, is_digital, status, existing_images
        } = req.body;

        // Combine existing images with new uploads
        let images = existing_images ? JSON.parse(existing_images) : [];
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/uploads/${file.filename}`);
            images = [...images, ...newImages];
        }

        const result = await pool.query(
            `UPDATE products SET
                category_id = $1, name_ar = $2, name_en = $3,
                price = $4, sale_price = $5, short_description = $6,
                description = $7, stock_quantity = $8, sku = $9,
                track_inventory = $10, is_featured = $11, is_digital = $12,
                status = $13, images = $14, updated_at = CURRENT_TIMESTAMP
            WHERE id = $15 RETURNING *`,
            [
                category_id, name_ar, name_en, price, sale_price,
                short_description, description, stock_quantity, sku,
                track_inventory !== 'false', is_featured === 'true', is_digital === 'true',
                status, JSON.stringify(images), id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Log activity
        await pool.query(
            'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
            [req.admin.id, 'updated', 'product', id, `Updated product: ${name_ar}`]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete product (Admin only)
app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const product = await pool.query('SELECT name_ar FROM products WHERE id = $1', [id]);
        if (product.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await pool.query('DELETE FROM products WHERE id = $1', [id]);

        // Log activity
        await pool.query(
            'INSERT INTO activity_logs (admin_id, action, entity_type, entity_id, description) VALUES ($1, $2, $3, $4, $5)',
            [req.admin.id, 'deleted', 'product', id, `Deleted product: ${product.rows[0].name_ar}`]
        );

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// CATEGORIES ROUTES
// ===================================

app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM categories WHERE is_active = true ORDER BY display_order, name_ar'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/categories', authenticateToken, async (req, res) => {
    try {
        const { name_ar, name_en, description } = req.body;
        const result = await pool.query(
            'INSERT INTO categories (name_ar, name_en, description) VALUES ($1, $2, $3) RETURNING *',
            [name_ar, name_en, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// ORDERS ROUTES
// ===================================

app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        const countQuery = 'SELECT COUNT(*) FROM orders WHERE 1=1' + (status ? ` AND status = $1` : '');
        const countParams = status ? [status] : [];
        const countResult = await pool.query(countQuery, countParams);

        res.json({
            orders: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single order with items
app.get('/api/admin/orders/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

        res.json({
            ...orderResult.rows[0],
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update order status
app.patch('/api/admin/orders/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, tracking_number } = req.body;

        let updateFields = ['status = $1'];
        let params = [status, id];
        let paramCount = 2;

        if (status === 'shipped' && tracking_number) {
            updateFields.push(`tracking_number = $${paramCount + 1}`);
            updateFields.push(`shipped_at = CURRENT_TIMESTAMP`);
            params.splice(1, 0, tracking_number);
            paramCount += 2;
        } else if (status === 'delivered') {
            updateFields.push('delivered_at = CURRENT_TIMESTAMP');
        }

        const query = `UPDATE orders SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// DASHBOARD STATS
// ===================================

app.get('/api/admin/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total revenue
        const revenueResult = await pool.query(
            'SELECT COALESCE(SUM(total), 0) as total_revenue FROM orders WHERE payment_status = $1',
            ['paid']
        );

        // Revenue this month
        const monthRevenueResult = await pool.query(
            'SELECT COALESCE(SUM(total), 0) as month_revenue FROM orders WHERE payment_status = $1 AND created_at >= $2',
            ['paid', thirtyDaysAgo]
        );

        // Total orders
        const ordersResult = await pool.query('SELECT COUNT(*) as total_orders FROM orders');

        // Pending orders
        const pendingResult = await pool.query(
            'SELECT COUNT(*) as pending_orders FROM orders WHERE status = $1',
            ['pending']
        );

        // Total products
        const productsResult = await pool.query('SELECT COUNT(*) as total_products FROM products');

        // Low stock products
        const lowStockResult = await pool.query(
            'SELECT COUNT(*) as low_stock FROM products WHERE stock_quantity <= low_stock_threshold AND track_inventory = true'
        );

        // Total customers
        const customersResult = await pool.query('SELECT COUNT(*) as total_customers FROM customers');

        res.json({
            total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
            month_revenue: parseFloat(monthRevenueResult.rows[0].month_revenue),
            total_orders: parseInt(ordersResult.rows[0].total_orders),
            pending_orders: parseInt(pendingResult.rows[0].pending_orders),
            total_products: parseInt(productsResult.rows[0].total_products),
            low_stock_count: parseInt(lowStockResult.rows[0].low_stock),
            total_customers: parseInt(customersResult.rows[0].total_customers)
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// Start Server
// ===================================
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

// ===================================
// MOYASAR PAYMENT ROUTES
// ===================================

// إنشاء جلسة دفع
app.post('/api/payments/create', async (req, res) => {
    try {
        const { amount, currency = 'SAR', description, callback_url, metadata } = req.body;
        const axios = require('axios');

        const response = await axios.post('https://api.moyasar.com/v1/payments', {
            amount: Math.round(amount * 100), // تحويل لهللات
            currency,
            description,
            callback_url: callback_url || `${process.env.FRONTEND_URL}/order-success`,
            source: { type: 'creditcard' },
            metadata
        }, {
            auth: {
                username: process.env.MOYASAR_API_KEY,
                password: ''
            }
        });

        res.json({
            payment_id: response.data.id,
            payment_url: response.data.source?.transaction_url,
            status: response.data.status
        });
    } catch (error) {
        console.error('Moyasar create payment error:', error.response?.data || error.message);
        res.status(500).json({ error: 'فشل إنشاء جلسة الدفع', details: error.response?.data });
    }
});

// التحقق من حالة الدفع
app.get('/api/payments/verify/:payment_id', async (req, res) => {
    try {
        const { payment_id } = req.params;
        const axios = require('axios');

        const response = await axios.get(`https://api.moyasar.com/v1/payments/${payment_id}`, {
            auth: {
                username: process.env.MOYASAR_API_KEY,
                password: ''
            }
        });

        const payment = response.data;

        // تحديث حالة الطلب في قاعدة البيانات
        if (payment.status === 'paid' && payment.metadata?.order_id) {
            await pool.query(
                `UPDATE orders SET 
                    payment_status = 'paid', 
                    payment_transaction_id = $1,
                    paid_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2`,
                [payment_id, payment.metadata.order_id]
            );
        }

        res.json({
            status: payment.status,
            amount: payment.amount / 100,
            currency: payment.currency,
            order_id: payment.metadata?.order_id
        });
    } catch (error) {
        console.error('Moyasar verify error:', error.response?.data || error.message);
        res.status(500).json({ error: 'فشل التحقق من الدفع' });
    }
});

// Webhook من Moyasar
app.post('/api/payments/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;

        if (type === 'payment.paid') {
            const orderId = data.metadata?.order_id;
            if (orderId) {
                await pool.query(
                    `UPDATE orders SET 
                        payment_status = 'paid',
                        payment_transaction_id = $1,
                        paid_at = CURRENT_TIMESTAMP,
                        status = 'processing',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2`,
                    [data.id, orderId]
                );
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// ===================================
// SHIPPING ROUTES
// ===================================

// جلب طرق الشحن المتاحة
app.get('/api/shipping/methods', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM shipping_methods WHERE is_active = true ORDER BY display_order'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get shipping methods error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// حساب تكلفة الشحن
app.post('/api/shipping/calculate', async (req, res) => {
    try {
        const { shipping_method_id, city, weight = 1 } = req.body;

        const method = await pool.query(
            'SELECT * FROM shipping_methods WHERE id = $1 AND is_active = true',
            [shipping_method_id]
        );

        if (method.rows.length === 0) {
            return res.status(404).json({ error: 'طريقة الشحن غير موجودة' });
        }

        const shippingMethod = method.rows[0];
        let cost = shippingMethod.price;

        res.json({
            method: shippingMethod.name_ar,
            cost,
            estimated_days: `${shippingMethod.estimated_days_min}-${shippingMethod.estimated_days_max} أيام عمل`,
            currency: 'SAR'
        });
    } catch (error) {
        console.error('Calculate shipping error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// تتبع الشحنة
app.get('/api/shipping/track/:tracking_number', async (req, res) => {
    try {
        const { tracking_number } = req.params;

        const order = await pool.query(
            'SELECT id, order_number, shipping_company, tracking_number, status, shipped_at FROM orders WHERE tracking_number = $1',
            [tracking_number]
        );

        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'رقم التتبع غير موجود' });
        }

        res.json({
            tracking_number,
            order_number: order.rows[0].order_number,
            shipping_company: order.rows[0].shipping_company,
            status: order.rows[0].status,
            shipped_at: order.rows[0].shipped_at
        });
    } catch (error) {
        console.error('Track shipment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// إنشاء طلب جديد (عام - للعملاء)
app.post('/api/orders', async (req, res) => {
    try {
        const { customer, items, shipping, payment_method, coupon_code } = req.body;

        // حساب المجموع
        let subtotal = 0;
        const productIds = items.map(i => i.product_id);
        const products = await pool.query(
            'SELECT id, name_ar, price, sale_price, stock_quantity, sku, images FROM products WHERE id = ANY($1)',
            [productIds]
        );

        const productMap = {};
        products.rows.forEach(p => { productMap[p.id] = p; });

        // التحقق من توفر المنتجات
        for (const item of items) {
            const product = productMap[item.product_id];
            if (!product) return res.status(400).json({ error: `منتج غير موجود: ${item.product_id}` });
            if (product.stock_quantity < item.quantity) {
                return res.status(400).json({ error: `الكمية المطلوبة غير متوفرة لـ: ${product.name_ar}` });
            }
            const price = product.sale_price || product.price;
            subtotal += price * item.quantity;
        }

        // جلب تكلفة الشحن
        const shippingMethod = await pool.query(
            'SELECT * FROM shipping_methods WHERE id = $1',
            [shipping.method_id]
        );
        const shippingCost = shippingMethod.rows[0]?.price || 0;
        const freeThreshold = shippingMethod.rows[0]?.free_shipping_threshold;
        const finalShippingCost = (freeThreshold && subtotal >= freeThreshold) ? 0 : shippingCost;

        // التحقق من الكوبون
        let discount = 0;
        let coupon = null;
        if (coupon_code) {
            const couponResult = await pool.query(
                `SELECT * FROM coupons WHERE code = $1 AND is_active = true 
                AND (expires_at IS NULL OR expires_at > NOW())
                AND (usage_limit IS NULL OR times_used < usage_limit)`,
                [coupon_code.toUpperCase()]
            );
            if (couponResult.rows.length > 0) {
                coupon = couponResult.rows[0];
                if (subtotal >= (coupon.minimum_order_amount || 0)) {
                    discount = coupon.discount_type === 'percentage'
                        ? subtotal * (coupon.discount_value / 100)
                        : coupon.discount_value;
                }
            }
        }

        const tax = (subtotal - discount) * 0.15;
        const total = subtotal + finalShippingCost - discount + tax;

        // توليد رقم الطلب
        const orderNumber = 'ORD-' + Date.now();

        // إنشاء أو الحصول على العميل
        let customerId = null;
        const existingCustomer = await pool.query(
            'SELECT id FROM customers WHERE email = $1', [customer.email]
        );
        if (existingCustomer.rows.length > 0) {
            customerId = existingCustomer.rows[0].id;
        } else {
            const newCustomer = await pool.query(
                `INSERT INTO customers (email, phone, first_name, last_name)
                VALUES ($1, $2, $3, $4) RETURNING id`,
                [customer.email, customer.phone, customer.first_name, customer.last_name]
            );
            customerId = newCustomer.rows[0].id;
        }

        // إنشاء الطلب
        const order = await pool.query(
            `INSERT INTO orders (
                order_number, customer_id, customer_email, customer_phone, customer_name,
                shipping_address, subtotal, shipping_cost, tax, discount, total,
                coupon_code, status, payment_method, shipping_method,
                shipping_company, payment_status
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            RETURNING *`,
            [
                orderNumber, customerId, customer.email, customer.phone,
                `${customer.first_name} ${customer.last_name}`,
                JSON.stringify(shipping.address),
                subtotal, finalShippingCost, tax, discount, total,
                coupon_code || null, 'pending', payment_method,
                shippingMethod.rows[0]?.name_ar || shipping.method_id,
                shippingMethod.rows[0]?.company || null, 'pending'
            ]
        );

        const orderId = order.rows[0].id;

        // إضافة items
        for (const item of items) {
            const product = productMap[item.product_id];
            const price = product.sale_price || product.price;
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, product_name, product_sku, product_image, price, quantity, subtotal)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [orderId, item.product_id, product.name_ar, product.sku,
                 product.images?.[0] || null, price, item.quantity, price * item.quantity]
            );
        }

        // تحديث استخدام الكوبون
        if (coupon) {
            await pool.query(
                'UPDATE coupons SET times_used = times_used + 1 WHERE id = $1', [coupon.id]
            );
        }

        res.status(201).json({
            order_id: orderId,
            order_number: orderNumber,
            total,
            subtotal,
            shipping_cost: finalShippingCost,
            tax,
            discount,
            status: 'pending'
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'فشل إنشاء الطلب', details: error.message });
    }
});

// جلب طلب بدون auth (للعميل بعد الدفع)
app.get('/api/orders/public/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, order_number, total, payment_status, status, shipping_method, created_at FROM orders WHERE id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// التحقق من كوبون الخصم
app.post('/api/coupons/validate', async (req, res) => {
    try {
        const { code, amount } = req.body;
        const result = await pool.query(
            `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = true 
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (usage_limit IS NULL OR times_used < usage_limit)`,
            [code]
        );
        if (result.rows.length === 0) return res.json({ valid: false });
        const coupon = result.rows[0];
        if (amount < (coupon.minimum_order_amount || 0)) {
            return res.json({ valid: false, error: `الحد الأدنى للطلب ${coupon.minimum_order_amount} ر.س` });
        }
        const discount = coupon.discount_type === 'percentage'
            ? amount * (coupon.discount_value / 100)
            : coupon.discount_value;
        res.json({ valid: true, discount: Math.min(discount, amount), code: coupon.code });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// BOOKINGS ROUTES
// ===================================
app.post('/api/bookings', async (req, res) => {
    try {
        const { first_name, last_name, email, phone, session_type, date, time_slot, consultation_topic, notes } = req.body;
        const bookingRef = 'BK-' + Date.now();

        // Find/create customer
        let customerId = null;
        const existing = await pool.query('SELECT id FROM customers WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            customerId = existing.rows[0].id;
        } else {
            const nc = await pool.query(
                'INSERT INTO customers (email, phone, first_name, last_name) VALUES ($1,$2,$3,$4) RETURNING id',
                [email, phone, first_name, last_name]
            );
            customerId = nc.rows[0].id;
        }

        await pool.query(
            `INSERT INTO bookings (booking_ref, customer_id, customer_name, customer_email, customer_phone,
                session_type, booking_date, time_slot, consultation_topic, notes, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')`,
            [bookingRef, customerId, `${first_name} ${last_name}`, email, phone,
             session_type, date, time_slot, consultation_topic, notes]
        );

        res.status(201).json({ booking_ref: bookingRef, status: 'confirmed' });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'فشل حفظ الحجز', details: error.message });
    }
});

app.get('/api/admin/bookings', authenticateToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let query = 'SELECT * FROM bookings WHERE 1=1';
        const params = [];
        if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        const count = await pool.query('SELECT COUNT(*) FROM bookings' + (status ? ` WHERE status = '${status}'` : ''));
        res.json({ bookings: result.rows, total: parseInt(count.rows[0].count) });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.patch('/api/admin/bookings/:id/status', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [req.body.status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// CONTACT MESSAGES ROUTES
// ===================================
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        await pool.query(
            'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES ($1,$2,$3,$4,$5)',
            [name, email, phone, subject, message]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/messages', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.patch('/api/admin/messages/:id/read', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE contact_messages SET is_read = true WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// BLOG ROUTES
// ===================================
app.get('/api/blog', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM blog_posts WHERE status = 'published' ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/blog', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title_ar, excerpt_ar, content_ar, category, status } = req.body;
        const slug = title_ar.replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '-' + Date.now();
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        const result = await pool.query(
            `INSERT INTO blog_posts (title_ar, excerpt_ar, content_ar, slug, category, status, image_url, author_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [title_ar, excerpt_ar, content_ar, slug, category, status || 'draft', image, req.admin.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

app.put('/api/admin/blog/:id', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title_ar, excerpt_ar, content_ar, category, status } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : req.body.existing_image;
        const result = await pool.query(
            `UPDATE blog_posts SET title_ar=$1, excerpt_ar=$2, content_ar=$3, category=$4,
             status=$5, image_url=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
            [title_ar, excerpt_ar, content_ar, category, status, image, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/blog/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===================================
// ENHANCED DASHBOARD STATS
// ===================================
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        const [revenue, orders, products, customers, bookings, messages, lowStock] = await Promise.all([
            pool.query("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE payment_status='paid'"),
            pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='pending' THEN 1 END) as pending FROM orders"),
            pool.query("SELECT COUNT(*) as total FROM products WHERE status='published'"),
            pool.query("SELECT COUNT(*) as total FROM customers"),
            pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status='pending' THEN 1 END) as pending FROM bookings"),
            pool.query("SELECT COUNT(*) as total FROM contact_messages WHERE is_read = false"),
            pool.query("SELECT COUNT(*) as total FROM products WHERE stock_quantity <= low_stock_threshold AND track_inventory=true"),
        ]);

        const recentOrders = await pool.query(
            "SELECT id, order_number, customer_name, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 5"
        );
        const recentBookings = await pool.query(
            "SELECT id, booking_ref, customer_name, session_type, booking_date, time_slot, status FROM bookings ORDER BY created_at DESC LIMIT 5"
        );

        res.json({
            revenue: parseFloat(revenue.rows[0].total),
            orders: { total: parseInt(orders.rows[0].total), pending: parseInt(orders.rows[0].pending) },
            products: parseInt(products.rows[0].total),
            customers: parseInt(customers.rows[0].total),
            bookings: { total: parseInt(bookings.rows[0].total), pending: parseInt(bookings.rows[0].pending) },
            unread_messages: parseInt(messages.rows[0].total),
            low_stock: parseInt(lowStock.rows[0].total),
            recent_orders: recentOrders.rows,
            recent_bookings: recentBookings.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
