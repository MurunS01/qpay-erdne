// /api/qpay-callback.js
// QPay төлбөр болсны дараа энэ URL-руу дуудана
// Shopify захиалгыг "paid" болгоно

const { checkPayment } = require('../lib/qpay');

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || 'erdne.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN; // Shopify Admin API token

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const order_id = req.query.order_id;
  const invoice_id = req.query.invoice_id || req.body?.invoice_id;

  if (!order_id) {
    return res.status(400).json({ error: 'order_id шаардлагатай' });
  }

  try {
    // 1. QPay-д төлбөр баталгаажсан эсэхийг шалгана
    let paymentConfirmed = false;

    if (invoice_id) {
      const paymentData = await checkPayment(invoice_id);
      // rows байвал төлөгдсөн
      paymentConfirmed = paymentData?.rows?.length > 0 ||
                         paymentData?.count > 0 ||
                         paymentData?.paid_amount > 0;
    } else {
      // invoice_id байхгүй ч callback ирсэн бол QPay-ийн дуудлага гэж үзнэ
      paymentConfirmed = true;
    }

    if (!paymentConfirmed) {
      console.log(`[QPay Callback] Төлбөр баталгаажаагүй — order_id: ${order_id}`);
      return res.status(200).json({ status: 'pending' });
    }

    // 2. Shopify Admin API-аар захиалгыг paid болгоно
    if (SHOPIFY_ACCESS_TOKEN) {
      await markShopifyOrderPaid(order_id);
    } else {
      console.warn('[QPay Callback] SHOPIFY_ADMIN_TOKEN тохируулаагүй — захиалга manually шалгана уу');
    }

    console.log(`[QPay Callback] ✅ Төлбөр амжилттай — order_id: ${order_id}`);
    return res.status(200).json({ success: true, order_id });

  } catch (err) {
    console.error('[QPay Callback Error]', err.message);
    // QPay 200 хариу авахгүй бол дахин дуудна тул 200 буцаана
    return res.status(200).json({ error: err.message });
  }
};

/**
 * Shopify захиалгыг paid болгох
 * Shopify Admin API v2024-01 ашиглана
 */
async function markShopifyOrderPaid(orderId) {
  // Эхлээд захиалгын мэдээлэл авна
  const orderRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${orderId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!orderRes.ok) {
    throw new Error(`Shopify order fetch failed: ${orderRes.status}`);
  }

  const { order } = await orderRes.json();

  // Аль хэдийн paid байвал алгасна
  if (order.financial_status === 'paid') {
    console.log(`[Shopify] Order ${orderId} аль хэдийн paid байна`);
    return;
  }

  // Transaction үүсгэж paid болгоно
  const txRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${orderId}/transactions.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction: {
          kind: 'capture',
          status: 'success',
          amount: order.total_price,
          currency: order.currency,
          gateway: 'QPay'
        }
      })
    }
  );

  if (!txRes.ok) {
    const errText = await txRes.text();
    throw new Error(`Shopify transaction failed: ${txRes.status} — ${errText}`);
  }

  console.log(`[Shopify] ✅ Order ${orderId} paid болголоо`);
}
