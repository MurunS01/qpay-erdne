module.exports = async function handler(req, res) {
  const { order_id, amount } = req.query;
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="mn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QPay - ERDNE</title>
<style>
body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f3f4f6}
.box{background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.logo{height:32px;margin-bottom:8px}
h3{margin:0 0 4px;font-size:18px;color:#111}
p{margin:0 0 16px;font-size:13px;color:#6b7280}
.amount{font-size:28px;font-weight:800;color:#0066cc;margin-bottom:16px}
.qr img{width:200px;height:200px;background:#f9fafb;border-radius:12px;padding:16px}
.banks{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:16px 0}
.bank-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#f3f4f6;border:none;border-radius:8px;font-size:12px;cursor:pointer;text-decoration:none;color:#111}
.bank-btn img{width:20px;height:20px;border-radius:4px}
.link-btn{display:inline-block;padding:10px 24px;background:#0066cc;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:16px}
.timer{font-size:13px;color:#ef4444;font-weight:600}
.spinner{width:40px;height:40px;margin:20px auto;border:3px solid #e5e7eb;border-top-color:#0066cc;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="box">
  <img src="https://qpay.mn/q/logo/qpay.png" class="logo" alt="QPay">
  <h3>QPay-ээр төлөх</h3>
  <p>Монголын аль ч банкны апп-аар төлнө үү</p>
  <div id="loading"><div class="spinner"></div><p>QR код үүсгэж байна...</p></div>
  <div id="content" style="display:none">
    <div class="amount" id="amount"></div>
    <div class="qr"><img id="qr-img" src="" alt="QR"></div>
    <p>📱 Банкны апп нээж QR уншуулна уу</p>
    <div class="banks" id="banks"></div>
    <a id="short-url" href="#" target="_blank" class="link-btn">🔗 Линкээр нээх</a>
    <div class="timer">⏱ Үлдсэн: <span id="countdown">10:00</span></div>
  </div>
  <div id="success" style="display:none"><div style="font-size:48px">✅</div><h3 style="color:#059669">Төлбөр амжилттай!</h3></div>
  <div id="error" style="display:none"><p style="color:#ef4444" id="err-msg">Алдаа гарлаа</p><button onclick="init()">Дахин оролдох</button></div>
</div>
<script>
const API = 'https://qpay-erdne-gkgy.vercel.app';
const ORDER_ID = '${order_id || "99999"}';
const AMOUNT = '${amount || "0"}';
let invoiceId, pollTimer, countTimer;

async function init() {
  show('loading');
  try {
    const res = await fetch(API+'/api/qpay-create', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id: ORDER_ID, total_price: AMOUNT})
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    invoiceId = data.invoice_id;
    document.getElementById('qr-img').src = 'data:image/png;base64,'+data.qr_image;
    document.getElementById('amount').textContent = '₮'+parseFloat(AMOUNT).toLocaleString();
    document.getElementById('short-url').href = data.short_url;
    const banks = document.getElementById('banks');
    (data.deep_links||[]).forEach(b => {
      banks.innerHTML += '<a href="'+b.link+'" class="bank-btn"><img src="'+b.logo+'" onerror="this.style.display=\'none\'"> '+(b.description||b.name)+'</a>';
    });
    show('content');
    countdown(600);
    poll();
  } catch(e) {
    document.getElementById('err-msg').textContent = e.message;
    show('error');
  }
}

function poll() {
  pollTimer = setInterval(async () => {
    try {
      const r = await fetch(API+'/api/qpay-callback?order_id='+ORDER_ID+'&invoice_id='+invoiceId);
      const d = await r.json();
      if (d.success) { clearInterval(pollTimer); clearInterval(countTimer); show('success'); }
    } catch(e){}
  }, 4000);
}

function countdown(s) {
  const el = document.getElementById('countdown');
  countTimer = setInterval(() => {
    s--;
    el.textContent = String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
    if (s<=0) { clearInterval(countTimer); clearInterval(pollTimer); show('error'); document.getElementById('err-msg').textContent='Хугацаа дууслаа'; }
  }, 1000);
}

function show(id) {
  ['loading','content','success','error'].forEach(x => {
    document.getElementById(x).style.display = x===id?'block':'none';
  });
}
init();
</script>
</body>
</html>`);
};
