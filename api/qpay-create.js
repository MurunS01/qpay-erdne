// /api/qpay-create.js
// Shopify-с дуудагддаг endpoint — QPay invoice үүсгэж QR буцаана

const { createInvoice } = require('../lib/qpay');

const ALLOWED_ORIGIN = process.env.SHOPIFY_DOMAIN || 'https://erdne.com';
const VERCEL_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.CALLBACK_BASE || 'https://qpay-erdne.vercel.app';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const order = req.body;

    // Хамгийн энгийн validation
    if (!order?.id || !order?.total_price) {
      return res.status(400).json({ error: 'order.id болон order.total_price шаардлагатай' });
    }

    if (parseFloat(order.total_price) <= 0) {
      return res.status(400).json({ error: 'Дүн 0-ээс их байх ёстой' });
    }

    const invoice = await createInvoice(order, VERCEL_URL);

    // Shopify checkout page-д хэрэгтэй мэдээлэл буцаана
    return res.status(200).json({
      success: true,
      invoice_id: invoice.invoice_id,
      qr_image: invoice.qr_image,         // base64 PNG
      qr_text: invoice.qr_text,
      short_url: invoice.qPay_shortUrl,   // SMS-ээр илгээх богино линк
      deep_links: invoice.urls || invoice.qPay_deeplink || []  // банкны app линкүүд
    });

  } catch (err) {
    console.error('[QPay Create Error]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
