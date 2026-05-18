module.exports = async function handler(req, res) {
  const order_id = String(req.query.order_id || '99999').replace(/['"]/g, '');
  const amount = String(req.query.amount || '0').replace(/[^0-9.]/g, '');

  const html = '<!DOCTYPE html>\n' +
'<html lang="mn">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>QPay - ERDNE</title>\n' +
'<style>\n' +
'body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f3f4f6}\n' +
'.box{background:#fff;border-radius:16px;padding:24px;max-width:380px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08)}\n' +
'.logo{height:32px;margin-bottom:8px}\n' +
'h3{margin:0 0 4px;font-size:18px;color:#111}\n' +
'p{margin:0 0 16px;font-size:13px;color:#6b7280}\n' +
'.amount{font-size:28px;font-weight:800;color:#0066cc;margin-bottom:16px}\n' +
'.qr img{width:200px;height:200px;background:#f9fafb;border-radius:12px;padding:16px}\n' +
'.banks{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:16px 0}\n' +
'.bank-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#f3f4f6;border:none;border-radius:8px;font-size:12px;cursor:pointer;text-decoration:none;color:#111}\n' +
'.bank-btn img{width:20px;height:20px;border-radius:4px}\n' +
'.link-btn{display:inline-block;padding:10px 24px;background:#0066cc;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:16px}\n' +
'.timer{font-size:13px;color:#ef4444;font-weight:600}\n' +
'.spinner{width:40px;height:40px;margin:20px auto;border:3px solid #e5e7eb;border-top-color:#0066cc;border-radius:50%;animation:spin 0.8s linear infinite}\n' +
'@keyframes spin{to{transform:rotate(360deg)}}\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<div class="box">\n' +
'  <img src="https://qpay.mn/q/logo/qpay.png" class="logo" alt="QPay">\n' +
'  <h3>QPay-\u044d\u044d\u0440 \u0442\u04e9\u043b\u04e9\u0445</h3>\n' +
'  <p>\u041c\u043e\u043d\u0433\u043e\u043b\u044b\u043d \u0430\u043b\u044c \u04e7 \u0431\u0430\u043d\u043a\u043d\u044b \u0430\u043f\u043f-\u0430\u0430\u0440 \u0442\u04e9\u043b\u043d\u04e9 \u04af\u04af</p>\n' +
'  <div id="loading"><div class="spinner"></div><p>QR \u043a\u043e\u0434 \u04af\u04af\u0441\u0433\u044d\u0436 \u0431\u0430\u0439\u043d\u0430...</p></div>\n' +
'  <div id="content" style="display:none">\n' +
'    <div class="amount" id="amount-display"></div>\n' +
'    <div class="qr"><img id="qr-img" src="" alt="QR"></div>\n' +
'    <p>\ud83d\udcf1 \u0411\u0430\u043d\u043a\u043d\u044b \u0430\u043f\u043f \u043d\u044d\u044d\u0436 QR \u0443\u043d\u0448\u0443\u0443\u043b\u043d\u0430 \u04af\u04af</p>\n' +
'    <div class="banks" id="banks"></div>\n' +
'    <a id="short-url" href="#" target="_blank" class="link-btn">\ud83d\udd17 \u041b\u0438\u043d\u043a\u044d\u044d\u0440 \u043d\u044d\u044d\u0445</a>\n' +
'    <div class="timer">\u23f1 \u04ae\u043b\u0434\u0441\u044d\u043d: <span id="countdown">10:00</span></div>\n' +
'  </div>\n' +
'  <div id="success" style="display:none"><div style="font-size:48px">\u2705</div><h3 style="color:#059669">\u0422\u04e9\u043b\u0431\u04e9\u0440 \u0430\u043c\u0436\u0438\u043b\u0442\u0442\u0430\u0439!</h3></div>\n' +
'  <div id="error" style="display:none"><p style="color:#ef4444" id="err-msg">\u0410\u043b\u0434\u0430\u0430 \u0433\u0430\u0440\u043b\u0430\u0430</p><button onclick="init()">\u0414\u0430\u0445\u0438\u043d \u043e\u0440\u043e\u043b\u0434\u043e\u0445</button></div>\n' +
'</div>\n' +
'<script>\n' +
'var API = "https://qpay-erdne-gkgy.vercel.app";\n' +
'var ORDER_ID = "' + order_id + '";\n' +
'var AMOUNT = "' + amount + '";\n' +
'var invoiceId, pollTimer, countTimer;\n' +
'\n' +
'function init() {\n' +
'  show("loading");\n' +
'  fetch(API+"/api/qpay-create", {\n' +
'    method: "POST",\n' +
'    headers: {"Content-Type": "application/json"},\n' +
'    body: JSON.stringify({id: ORDER_ID, total_price: AMOUNT})\n' +
'  })\n' +
'  .then(function(r){ return r.json(); })\n' +
'  .then(function(data){\n' +
'    if (!data.success) throw new Error(data.error);\n' +
'    invoiceId = data.invoice_id;\n' +
'    document.getElementById("qr-img").src = "data:image/png;base64,"+data.qr_image;\n' +
'    document.getElementById("amount-display").textContent = "\u20ae" + (parseFloat(AMOUNT)/100).toLocaleString();\n' +
'    document.getElementById("short-url").href = data.short_url;\n' +
'    var banks = document.getElementById("banks");\n' +
'    (data.deep_links||[]).forEach(function(b){\n' +
'      banks.innerHTML += "<a href=\\""+b.link+"\\" class=\\"bank-btn\\"><img src=\\""+b.logo+"\\" onerror=\\"this.style.display=\'none\'\\"> "+(b.description||b.name)+"</a>";\n' +
'    });\n' +
'    show("content");\n' +
'    countdown(600);\n' +
'    poll();\n' +
'  })\n' +
'  .catch(function(e){\n' +
'    document.getElementById("err-msg").textContent = e.message;\n' +
'    show("error");\n' +
'  });\n' +
'}\n' +
'\n' +
'function poll() {\n' +
'  pollTimer = setInterval(function(){\n' +
'    fetch(API+"/api/qpay-callback?order_id="+ORDER_ID+"&invoice_id="+invoiceId)\n' +
'    .then(function(r){ return r.json(); })\n' +
'    .then(function(d){\n' +
'      if (d.success) { clearInterval(pollTimer); clearInterval(countTimer); show("success"); }\n' +
'    })\n' +
'    .catch(function(){});\n' +
'  }, 4000);\n' +
'}\n' +
'\n' +
'function countdown(s) {\n' +
'  var el = document.getElementById("countdown");\n' +
'  countTimer = setInterval(function(){\n' +
'    s--;\n' +
'    el.textContent = String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");\n' +
'    if (s<=0) { clearInterval(countTimer); clearInterval(pollTimer); show("error"); document.getElementById("err-msg").textContent="\u0425\u0443\u0433\u0430\u0446\u0430\u0430 \u0434\u0443\u0443\u0441\u043b\u0430\u0430"; }\n' +
'  }, 1000);\n' +
'}\n' +
'\n' +
'function show(id) {\n' +
'  ["loading","content","success","error"].forEach(function(x){\n' +
'    document.getElementById(x).style.display = x===id ? "block" : "none";\n' +
'  });\n' +
'}\n' +
'init();\n' +
'</script>\n' +
'</body>\n' +
'</html>';

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};
