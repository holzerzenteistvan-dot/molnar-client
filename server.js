const express = require('express'), Database = require('better-sqlite3'), crypto = require('crypto'), path = require('path');
const cfg = require('./config');
const db = new Database('data.db');
db.exec(`create table if not exists orders(id text primary key,email text,plan text,method text,status text,key text,created int);
create table if not exists licenses(key text primary key,email text,plan text,expires int,hwid text,created int)`);
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const app = express();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newKey = () => 'MM-' + [1,2,3].map(() => crypto.randomBytes(2).toString('hex').toUpperCase()).join('-');

function fulfill(id) {
  const o = db.prepare('select * from orders where id=?').get(id);
  if (!o || o.status === 'paid') return;
  const key = newKey(), plan = cfg.plans[o.plan], now = Date.now();
  db.prepare('insert into licenses values(?,?,?,?,?,?)').run(key, o.email, o.plan, plan.days ? now + plan.days * 864e5 : null, null, now);
  db.prepare("update orders set status='paid',key=? where id=?").run(key, id);
}

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const ev = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (ev.type === 'checkout.session.completed') fulfill(ev.data.object.metadata.orderId);
    res.sendStatus(200);
  } catch { res.sendStatus(400); }
});

app.use(express.json()); app.use(express.urlencoded({ extended: false }));

app.get('/api/config', (_, res) => res.json({
  plans: cfg.plans, currency: cfg.currency, discord: cfg.discord,
  methods: Object.fromEntries(Object.entries(cfg.methods).filter(([, m]) => m.enabled).map(([k, m]) => [k, { label: m.label }]))
}));

app.post('/api/order', async (req, res) => {
  const { email, plan, method } = req.body, p = cfg.plans[plan], m = cfg.methods[method];
  if (!p || !m || !m.enabled || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) return res.status(400).json({ error: 'Check your email, plan and payment method.' });
  const id = crypto.randomBytes(12).toString('hex');
  db.prepare("insert into orders values(?,?,?,?,'pending',null,?)").run(id, email, plan, method, Date.now());
  if (method === 'stripe') {
    if (!stripe) return res.status(500).json({ error: 'Card payments are not set up yet.' });
    const s = await stripe.checkout.sessions.create({
      mode: 'payment', customer_email: email, metadata: { orderId: id },
      line_items: [{ quantity: 1, price_data: { currency: cfg.currency, unit_amount: p.price * 100, product_data: { name: 'MolnarMacros ' + p.name } } }],
      success_url: `${process.env.BASE_URL}/?order=${id}`, cancel_url: process.env.BASE_URL
    });
    return res.json({ url: s.url });
  }
  res.json({ orderId: id, instructions: m.instructions });
});

app.get('/api/order/:id', (req, res) => {
  const o = db.prepare('select status,key from orders where id=?').get(req.params.id);
  o ? res.json(o) : res.sendStatus(404);
});

const admin = (req, res, next) => (req.query.token || req.body.token) === process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN ? next() : res.sendStatus(404);
app.get('/admin', admin, (req, res) => {
  const q = (req.query.q || '').trim(), t = esc(req.query.token);
  const rows = q
    ? db.prepare('select * from orders where id=? or key=? or email like ? order by created desc limit 50').all(q, q.toUpperCase(), '%' + q + '%')
    : db.prepare("select * from orders where status='pending' and method!='stripe' order by created desc").all();
  const row = o => `<form method=post action="/admin/paid" style="margin:10px 0"><input type=hidden name=token value="${t}"><input type=hidden name=id value="${o.id}">
    <code>${o.id}</code> | ${esc(o.email)} | ${o.plan} | ${o.method} | <b>${o.status}</b> | ${o.key ? '<code>' + o.key + '</code>' : 'no key yet'} | ${new Date(o.created).toISOString().slice(0, 16)}
    ${o.status === 'pending' ? '<button>Mark paid</button>' : ''}</form>`;
  res.send(`<body style="font:15px system-ui;background:#000;color:#eee;padding:24px"><h1>Orders</h1>
    <form><input type=hidden name=token value="${t}"><input name=q value="${esc(q)}" placeholder="license key, email or order ID" size=40> <button>Search</button></form>
    <h2>${q ? 'Results' : 'Pending manual orders'}</h2>` + (rows.map(row).join('') || '<p>Nothing found.</p>'));
});
app.post('/admin/paid', admin, (req, res) => { fulfill(req.body.id); res.redirect('/admin?token=' + encodeURIComponent(req.body.token)); });

// Only paid orders can download. The file lives in /private, which is never served publicly.
app.get('/download/:id', (req, res) => {
  const o = db.prepare('select status from orders where id=?').get(req.params.id);
  if (!o || o.status !== 'paid') return res.sendStatus(403);
  res.download(path.join(__dirname, 'private', process.env.DOWNLOAD_FILE || 'MolnarMacros.zip'));
});

app.use(express.static('public', { extensions: ['html'] }));
app.listen(process.env.PORT || 3000);
