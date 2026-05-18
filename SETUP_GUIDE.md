# QPay × ERDNE.COM Shopify — Суурилуулах заавар

## 📁 Файлуудын бүтэц
```
qpay-erdne/
├── api/
│   ├── qpay-create.js      ← Invoice үүсгэх endpoint
│   └── qpay-callback.js    ← Төлбөр баталгаажуулах endpoint
├── lib/
│   └── qpay.js             ← QPay API client (token, invoice, check)
├── public/
│   └── qpay-payment.liquid ← Shopify theme snippet
├── vercel.json             ← Vercel тохиргоо
├── package.json
└── .env.example            ← Орчны хувьсагч жишээ
```

---

## АЛХАМ 1 — GitHub repo үүсгэх

1. **github.com** → New repository → нэр: `qpay-erdne`
2. Дараах командуудыг terminal-д ажиллуулна:

```bash
cd qpay-erdne
git init
git add .
git commit -m "QPay integration for ERDNE.COM"
git remote add origin https://github.com/ЧИНИЙ_USERNAME/qpay-erdne.git
git push -u origin main
```

---

## АЛХАМ 2 — Vercel-д deploy хийх

1. **vercel.com** → Log in with GitHub
2. "Add New Project" → GitHub repo-оо сонгоно (`qpay-erdne`)
3. **Environment Variables** хэсэгт дараахыг нэмнэ:

   | Key | Value |
   |-----|-------|
   | `QPAY_USERNAME` | `ERDNE_COM` |
   | `QPAY_PASSWORD` | `kJswDq9H` |
   | `QPAY_INVOICE_CODE` | `ERDNE_COM_INVOICE` |
   | `SHOPIFY_DOMAIN` | `erdne.com` |
   | `SHOPIFY_ADMIN_TOKEN` | *(доор харна)* |

4. "Deploy" дарна → URL авна, жишээ нь: `https://qpay-erdne.vercel.app`

---

## АЛХАМ 3 — Shopify Admin API token авах

1. Shopify Admin → **Settings → Apps and sales channels**
2. **Develop apps** → "Create an app" → нэр: `QPay Integration`
3. **Configuration** → Admin API access → дараах permission-уудыг нэмнэ:
   - `read_orders` ✓
   - `write_orders` ✓
4. **Install app** → **Admin API access token** → "Reveal once" → хуулна
5. Vercel-ийн env var-д `SHOPIFY_ADMIN_TOKEN` гэж нэмнэ

---

## АЛХАМ 4 — qpay-payment.liquid snippet суурилуулах

1. Shopify Admin → **Online Store → Themes → Edit code**
2. **Snippets** хавтас → "Add a new snippet" → нэр: `qpay-payment`
3. `public/qpay-payment.liquid` файлын агуулгыг тэнд paste хийнэ
4. **Нэг мөрийг өөрчлөх шаардлагатай:**
   ```js
   // Энэ мөрийг знайд АЛХАМ 2-т авсан Vercel URL-ээр солино:
   const VERCEL_API = 'https://qpay-erdne.vercel.app';
   //                  ↑ ЭНЭ МӨРИЙГ СОЛИХ
   ```

---

## АЛХАМ 5 — Checkout дээр QPay харуулах

Shopify-ийн **checkout.liquid** (Shopify Plus шаардлагатай) эсвэл
**thank_you.liquid** дотор:

```liquid
{% render 'qpay-payment' %}
```

> **Shopify Basic/Grow plan байвал:** checkout customize ашиглах боломж хязгаарлагдмал тул
> **Order status page** (thank_you) дээр суурилуулна. Хэрэглэгч захиалга хийсний дараа
> QPay-ээр төлнө.

---

## АЛХАМ 6 — Тест хийх

Vercel deploy болсны дараа browser-т:

```
https://qpay-erdne.vercel.app/api/qpay-create
```

POST request илгээнэ (Postman эсвэл curl):

```bash
curl -X POST https://qpay-erdne.vercel.app/api/qpay-create \
  -H "Content-Type: application/json" \
  -d '{
    "id": 99999,
    "order_number": "TEST-001",
    "total_price": "100",
    "email": "test@erdne.com"
  }'
```

QR кодтой response ирвэл амжилттай! ✅

---

## ❗ Анхааруулга

- `kJswDq9H` password-ийг Vercel env var-д нэмсний дараа `lib/qpay.js`-д hardcode байгааг устгах:
  ```js
  const PASSWORD = process.env.QPAY_PASSWORD; // .env-ээс авна
  ```
- QPay-ийн token-ийг давтан авч болохгүй (rate limit бий)
- Production дээр `callback_url` нь **HTTPS** байх ёстой

---

## 🆘 Тусламж хэрэгтэй бол

QPay техник дэмжлэг: tergel.t@qpay.mn | 7610-2211
