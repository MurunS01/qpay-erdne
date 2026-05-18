const QPAY_BASE = "https://merchant.qpay.mn/v2";
const QPAY_USERNAME = process.env.QPAY_USERNAME || "ERDNE_COM";
const QPAY_PASSWORD = process.env.QPAY_PASSWORD || "kJswDq9H";
const INVOICE_CODE = process.env.QPAY_INVOICE_CODE || "ERDNE_COM_INVOICE";

let tokenCache = { access_token: null, expires_at: 0 };

async function getToken() {
  const now = Date.now();
  if (tokenCache.access_token && now < tokenCache.expires_at - 60000) {
    return tokenCache.access_token;
  }
  const credentials = Buffer.from(QPAY_USERNAME + ":" + QPAY_PASSWORD).toString("base64");
  const res = await fetch(QPAY_BASE + "/auth/token", {
    method: "POST",
    headers: { Authorization: "Basic " + credentials },
  });
  if (!res.ok) throw new Error("QPay token error: " + res.status);
  const data = await res.json();
  tokenCache = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

async function createInvoice(order, callbackBase) {
  const token = await getToken();
  const orderId = String(order.id || order.order_id || "0");
  const amount = parseFloat(order.total_price || order.amount || 0) / 100;
  const callbackUrl = "https://qpay-erdne-gkgy.vercel.app/api/qpay-callback?order_id=" + orderId;
  const body = {
    invoice_code: INVOICE_CODE,
    sender_invoice_no: orderId,
    invoice_receiver_code: "terminal",
    invoice_description: "ERDNE Order " + orderId,
    amount: amount,
    callback_url: callbackUrl,
  };

  const res = await fetch(QPAY_BASE + "/invoice", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("QPay invoice error: " + res.status + " - " + err);
  }

  const data = await res.json();
  return {
    invoice_id: data.invoice_id,
    qr_image: data.qr_image,
    qr_text: data.qr_text,
    qPay_shortUrl: data.qPay_shortUrl,
    urls: data.urls || [],
  };
}

async function checkPayment(invoiceId) {
  const token = await getToken();
  const res = await fetch(QPAY_BASE + "/payment/check", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 10 },
    }),
  });
  if (!res.ok) throw new Error("QPay check error: " + res.status);
  return res.json();
}

module.exports = { createInvoice, checkPayment, getToken };
