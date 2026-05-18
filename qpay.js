// ============================================================
// QPay V2 Backend — ERDNE.COM
// Vercel Serverless Functions
// ============================================================

const QPAY_BASE = "https://merchant.qpay.mn/v2";
const QPAY_USERNAME = process.env.QPAY_USERNAME || "ERDNE_COM";
const QPAY_PASSWORD = process.env.QPAY_PASSWORD || "kJswDq9H";
const INVOICE_CODE = process.env.QPAY_INVOICE_CODE || "ERDNE_COM_INVOICE";
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN; // e.g. erdne.myshopify.com
const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN; // Admin API token
const CALLBACK_BASE = process.env.CALLBACK_BASE_URL; // e.g. https://qpay-erdne.vercel.app

// Simple in-memory token cache (per serverless instance)
let tokenCache = { access_token: null, expires_at: 0 };

// ----------------------------------------------------------
// TOKEN: авах / сунгах
// ----------------------------------------------------------
async function getToken() {
  const now = Date.now();
  if (tokenCache.access_token && now < tokenCache.expires_at - 60000) {
    return tokenCache.access_token;
  }

  const credentials = Buffer.from(`${QPAY_USERNAME}:${QPAY_PASSWORD}`).toString("base64");
  const res = await fetch(`${QPAY_BASE}/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) throw new Error(`QPay token error: ${res.status}`);
  const data = await res.json();

  tokenCache = {
    access_token: data.access_token,
    expires_at: data.expires_in * 1000, // timestamp milliseconds
  };

  return data.access_token;
}

// ----------------------------------------------------------
// INVOICE: үүсгэх
// ----------------------------------------------------------
async function createInvoice({ orderId, orderName, amount, customerEmail, customerPhone }) {
  const token = await getToken();

  const body = {
    invoice_code: INVOICE_CODE,
    sender_invoice_no: String(orderId),
    invoice_receiver_code: "terminal",
    invoice_description: `ERDNE Order ${orderName}`,
    amount: parseFloat(amount),
    callback_url: `${CALLBACK_BASE}/api/qpay?action=callback&order_id=${orderId}`,
    invoice_receiver_data: {
      email: customerEmail || "",
      phone: customerPhone || "",
    },
  };

  const res = await fetch(`${QPAY_BASE}/invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QPay invoice error: ${res.status} — ${err}`);
  }

  return res.json();
}

// ----------------------------------------------------------
// PAYMENT CHECK: төлөлт шалгах
// ----------------------------------------------------------
async function checkPayment(invoiceId) {
  const token = await getToken();

  const res = await fetch(`${QPAY_BASE}/payment/check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 10 },
    }),
  });

  if (!res.ok) throw new Error(`QPay check error: ${res.status}`);
  return res.json();
}

// ----------------------------------------------------------
// SHOPIFY: захиалгыг paid болгох
// ----------------------------------------------------------
async function markShopifyOrderPaid(orderId) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) return; // skip if not configured

  // Get pending transactions
  const txRes = await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${orderId}/transactions.json`,
    { headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN } }
  );
  const { transactions } = await txRes.json();
  const pending = transactions?.find((t) => t.kind === "authorization" || t.status === "pending");

  // Capture payment
  await fetch(
    `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${orderId}/transactions.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: {
          kind: "capture",
          status: "success",
          parent_id: pending?.id,
          gateway: "QPay",
        },
      }),
    }
  );
}

// ----------------------------------------------------------
// MAIN HANDLER
// ----------------------------------------------------------
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", `https://erdne.com`);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;

  try {
    // ── 1. INVOICE үүсгэх ──────────────────────────────────
    if (action === "create" && req.method === "POST") {
      const { orderId, orderName, amount, customerEmail, customerPhone } = req.body;
      if (!orderId || !amount) return res.status(400).json({ error: "orderId, amount шаардлагатай" });

      const invoice = await createInvoice({ orderId, orderName, amount, customerEmail, customerPhone });

      return res.status(200).json({
        invoice_id: invoice.invoice_id,
        qr_image: invoice.qr_image,         // base64
        qr_text: invoice.qr_text,
        short_url: invoice.qPay_shortUrl,
        deeplinks: invoice.qPay_deeplink || invoice.urls || [],
      });
    }

    // ── 2. ТӨЛӨЛТ ШАЛГАХ (polling) ─────────────────────────
    if (action === "check" && req.method === "GET") {
      const { invoice_id } = req.query;
      if (!invoice_id) return res.status(400).json({ error: "invoice_id шаардлагатай" });

      const result = await checkPayment(invoice_id);
      const paid = result?.count > 0;
      return res.status(200).json({ paid, detail: result });
    }

    // ── 3. CALLBACK (QPay → манай сервер) ──────────────────
    if (action === "callback") {
      const orderId = req.query.order_id;
      const invoiceId = req.query.invoice_id || req.body?.invoice_id;

      if (invoiceId) {
        const result = await checkPayment(invoiceId);
        if (result?.count > 0) {
          await markShopifyOrderPaid(orderId);
        }
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: "Тодорхойгүй action" });
  } catch (err) {
    console.error("[QPay Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
