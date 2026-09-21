const KEY = "chonha-web-vs-v1";
const EXPRESS_FEE = 25000;
const SLOT_FEE = 15000;
const SHOP_PROMO_CAP = 40000;
const NAV_CUSTOMER = [
  ["home", "Trang chủ"],
  ["products", "Sản phẩm"],
  ["cart", "Giỏ hàng"],
  ["ai", "Trợ lý AI"],
  ["orders", "Đơn hàng"],
  ["account", "Tài khoản"],
  ["reviews", "Đánh giá"],
  ["voucher", "Voucher"]
];
const NAV_ADMIN = [
  ["dashboard", "Tổng quan"],
  ["products", "Sản phẩm"],
  ["orders", "Đơn hàng"],
  ["customers", "Khách hàng"],
  ["reviews", "Đánh giá"],
  ["vouchers", "Voucher"]
];
const NAV_ADMIN_EXTRA = [
  ["categories", "Danh mục"],
  ["ai", "Quản lý AI"],
  ["reports", "Báo cáo"]
];

const store = {
  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.products?.length) return migrate(raw);
    } catch { /* ignore */ }
    return seed();
  },
  save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
};

function seed() {
  const s = {
    users: [
      { user: "admin", pass: "Admin@123", name: "Quản trị viên", role: "ADMIN", email: "admin@chonhasmartfood.vn", phone: "0900000000", address: "Kho Chợ Nhà, Hà Nội" },
      { user: "staff", pass: "Staff@123", name: "Nhân viên", role: "STAFF", email: "staff@chonhasmartfood.vn", phone: "0901111111", address: "Kho Chợ Nhà, Hà Nội" },
      { user: "customer", pass: "Customer@123", name: "Khách hàng demo", role: "CUSTOMER", email: "customer@email.com", phone: "0912345678", address: "12 Nguyễn Thái Học, Ba Đình, Hà Nội", budget: 200000, gender: "Nam", prefs: ["Gia đình 4 người"] }
    ],
    session: null,
    cart: [],
    orders: [],
    products: PRODUCTS_SEED.map(p => ({ ...p })),
    categories: CATS_META.map(c => ({ ...c, active: true })),
    reviews: [],
    wallets: {
      customer: { xu: 20000, spins: 3, lastCheckin: "", vouchers: [], points: 0 }
    },
    chat: [],
    wheel: WHEEL_PRIZES.map(p => ({ ...p }))
  };
  store.save(s);
  return s;
}

function migrate(s) {
  s.products ||= PRODUCTS_SEED.map(p => ({ ...p }));
  s.categories ||= CATS_META.map(c => ({ ...c, active: true }));
  s.reviews ||= [];
  s.wallets ||= {};
  s.chat ||= [];
  s.orders ||= [];
  s.cart ||= [];
  if (!s.wheel?.length) s.wheel = WHEEL_PRIZES.map(p => ({ ...p }));
  const byId = Object.fromEntries(PRODUCTS_SEED.map(p => [p.id, p]));
  s.products.forEach(p => {
    const seed = byId[p.id];
    if (seed?.img) p.img = seed.img;
  });
  s.cart.forEach(x => { if (byId[x.id]?.img) x.img = byId[x.id].img; });
  (s.orders || []).forEach(o => (o.items || []).forEach(i => {
    if (byId[i.id]?.img) i.img = byId[i.id].img;
  }));
  persistSafe(s);
  return s;
}

function persistSafe(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let db = store.load();
let view = "home";
let adminView = "dashboard";
let catFilter = "Tất cả";
let keyword = "";
let detailId = null;
let accountTab = "profile";
let checkout = { express: true, pay: "COD", voucher: "", voucherOn: false, voucherOff: 0, voucherShip: false, slot: "Giao 18:00 – 20:00" };
let qtyPick = 1;
let wheelAngle = 0;
let wheelBusy = false;
let reviewSelected = {};
let reviewPage = 1;
let reviewKw = "";
let reviewCat = "Tất cả";
let reviewDraft = null;
let pendingLogin = null;
const GUEST_VIEWS = new Set(["home", "products", "detail", "login", "register"]);

const $ = id => document.getElementById(id);
const vnd = n => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + "đ";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isAdmin = () => db.session?.role === "ADMIN" || db.session?.role === "STAFF";
const isAdminOnly = () => db.session?.role === "ADMIN";

function persist() { store.save(db); }

function prizes() {
  if (!db.wheel?.length) db.wheel = WHEEL_PRIZES.map(p => ({ ...p }));
  return db.wheel;
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.className = "hidden", 2400);
}

function walletOf(user) {
  if (!db.wallets[user]) db.wallets[user] = { xu: 0, spins: 3, lastCheckin: "", vouchers: [], points: 0 };
  return db.wallets[user];
}

function requireLogin(msg, name, extra) {
  pendingLogin = { view: name || "home", extra: extra || null, add: extra?.add || null, msg: msg || "Đăng nhập để mua hàng." };
  view = "login";
  toast(pendingLogin.msg);
  render();
}

function nav(name, extra) {
  if (name === "login" || name === "register") {
    view = name;
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  if (!db.session && !GUEST_VIEWS.has(name)) {
    requireLogin("Đăng nhập để mua hàng và dùng tài khoản.", name, extra);
    return;
  }
  view = name;
  if (extra?.id) detailId = extra.id;
  if (extra?.cat) catFilter = extra.cat;
  if (extra?.q != null) keyword = extra.q;
  if (name === "products") qtyPick = 1;
  if (name === "detail") qtyPick = 1;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function logout() {
  if (!confirm("Đăng xuất khỏi hệ thống?")) return;
  db.session = null;
  db.cart = [];
  persist();
  view = "home";
  toast("Đã đăng xuất. Bạn vẫn xem được sản phẩm.");
  render();
}

function login(e) {
  e.preventDefault();
  const user = $("login-user").value.trim();
  const pass = $("login-pass").value;
  const found = db.users.find(u => (u.user === user || u.email === user) && u.pass === pass);
  if (!found) { $("login-err").textContent = "Đăng nhập không thành công."; return; }
  db.session = { user: found.user, name: found.name, role: found.role, email: found.email, phone: found.phone };
  persist();
  const pending = pendingLogin;
  pendingLogin = null;
  adminView = "dashboard";
  if (isAdmin()) view = "admin";
  else {
    view = pending?.view && pending.view !== "login" && pending.view !== "register" ? pending.view : "home";
    if (pending?.extra?.id) detailId = pending.extra.id;
    if (pending?.add) addCartNow(pending.add.id, pending.add.qty);
  }
  toast("Xin chào, " + found.name);
  render();
}

function register(e) {
  e.preventDefault();
  const name = $("reg-name").value.trim();
  const phone = $("reg-phone").value.trim();
  const email = $("reg-email").value.trim();
  const user = $("reg-user").value.trim();
  const pass = $("reg-pass").value;
  const pass2 = $("reg-pass2").value;
  const err = $("reg-err");
  if (name.length < 3) return err.textContent = "Nhập họ tên.";
  if (user.length < 3) return err.textContent = "Tên đăng nhập tối thiểu 3 ký tự.";
  if (pass.length < 6) return err.textContent = "Mật khẩu tối thiểu 6 ký tự.";
  if (pass !== pass2) return err.textContent = "Mật khẩu nhập lại không khớp.";
  if (!$("reg-terms")?.checked) return err.textContent = "Hãy đồng ý điều khoản thành viên.";
  if (db.users.some(u => u.user === user)) return err.textContent = "Tên đăng nhập đã tồn tại.";
  db.users.push({ user, pass, name, role: "CUSTOMER", email, phone, address: "", budget: 200000, gender: "", prefs: [] });
  walletOf(user).vouchers.push({ code: "CHONHAMOI", title: "Giảm 15.000đ khách mới", loai: "amount", value: 15000, min: 100000 });
  db.session = { user, name, role: "CUSTOMER", email, phone };
  persist();
  view = "home";
  toast("Đăng ký thành công. Đã nhận quà tân thủ!");
  render();
}

function cartCount() { return db.cart.reduce((s, x) => s + x.qty, 0); }
function product(id) { return db.products.find(p => p.id === id); }

function addCart(id, qty = 1) {
  if (!db.session) {
    requireLogin("Đăng nhập để thêm vào giỏ và mua hàng.", view === "detail" ? "detail" : "products", { id, add: { id, qty } });
    return;
  }
  addCartNow(id, qty);
  render();
}

function addCartNow(id, qty = 1) {
  const p = product(id);
  if (!p || !p.active) return toast("Sản phẩm không còn bán.");
  const line = db.cart.find(x => x.id === id);
  const next = (line?.qty || 0) + qty;
  if (next > p.stock) return toast("Không đủ số lượng trong kho.");
  if (line) line.qty = next;
  else db.cart.push({ id, qty, name: p.name, price: p.price, img: p.img, unit: p.unit });
  persist();
  toast("Đã thêm " + p.name + " vào giỏ.");
}

function setQty(id, d) {
  const line = db.cart.find(x => x.id === id);
  if (!line) return;
  line.qty += d;
  if (line.qty <= 0) db.cart = db.cart.filter(x => x.id !== id);
  persist();
  render();
}

function subtotal() { return db.cart.reduce((s, x) => s + x.price * x.qty, 0); }

function shopPromo(sub) {
  if (sub < 150000) return 0;
  return Math.min(SHOP_PROMO_CAP, Math.floor(sub * 0.12 / 1000) * 1000);
}

function applyVoucherCode(code, sub) {
  code = (code || "").trim().toUpperCase();
  const camp = CAMPAIGNS.find(c => c.code === code);
  const w = walletOf(db.session.user);
  const fromWallet = w.vouchers.find(v => v.code === code);
  const v = camp || fromWallet;
  if (!v) return { ok: false, msg: "Mã không hợp lệ. Thử CHONHAMOI, CHONHA hoặc mã vòng quay." };
  if (v.loai === "ship") return { ok: true, off: 0, ship: true, msg: "Đã áp dụng " + code + " — freeship 2H." };
  const off = v.loai === "percent" ? Math.round(sub * v.value / 100) : v.value;
  if (sub < (v.min || 0)) return { ok: false, msg: "Đơn cần từ " + vnd(v.min) + " để dùng mã này." };
  return { ok: true, off, ship: false, msg: "Đã áp dụng " + code + " — giảm " + vnd(off) + "." };
}

function totals() {
  const sub = subtotal();
  const shop = shopPromo(sub);
  const ship = db.cart.length === 0 ? 0 : (checkout.express ? EXPRESS_FEE : SLOT_FEE);
  const free = checkout.express && ship > 0 ? ship : 0;
  let voucher = checkout.voucherOn ? checkout.voucherOff : 0;
  if (checkout.pay === "VNPAY-QR" && sub >= 100000) voucher += 15000;
  const w = db.session ? walletOf(db.session.user) : { points: 0 };
  const usePts = checkout.usePts ? Math.min(w.points || 0, Math.floor(sub / 100)) : 0;
  const reward = usePts * 100;
  const shipAfter = checkout.voucherShip ? 0 : ship;
  const freeAfter = checkout.voucherShip ? 0 : free;
  const saved = shop + freeAfter + voucher + reward + (checkout.voucherShip ? ship : 0);
  const total = Math.max(0, sub + shipAfter - shop - freeAfter - voucher - reward);
  return { sub, shop, ship: shipAfter, free: freeAfter, voucher, reward, total, saved, n: db.cart.reduce((s, x) => s + x.qty, 0) };
}

function doCheckout(e) {
  e.preventDefault();
  if (!db.session) { requireLogin("Đăng nhập để đặt hàng.", "checkout"); return; }
  if (!db.cart.length) return;
  const name = $("ck-name").value.trim();
  const phone = $("ck-phone").value.trim();
  const addr = $("ck-addr").value.trim();
  if (!name || !phone || !addr) { $("ck-err").textContent = "Nhập họ tên, SĐT và địa chỉ nhận hàng."; return; }
  const t = totals();
  const note = ($("ck-note")?.value || "").trim();
  const order = {
    ma: "HD" + Date.now().toString().slice(-8),
    when: new Date().toLocaleString("vi-VN"),
    user: db.session.user,
    name, phone, addr,
    note: (note ? note + " | " : "") + (checkout.express ? "Hỏa tốc 2H" : "Hẹn giờ: " + checkout.slot),
    pay: checkout.pay,
    items: db.cart.map(x => ({ ...x })),
    sub: t.sub,
    ship: t.ship,
    discount: t.saved,
    total: t.total,
    status: "Chờ xác nhận"
  };
  db.orders.unshift(order);
  const w = walletOf(db.session.user);
  w.points = (w.points || 0) + Math.floor(t.total / 1000);
  if (t.total >= 199000) w.spins += 2;
  if (checkout.voucherOn && checkout.voucher) {
    w.vouchers = w.vouchers.filter(v => v.code !== checkout.voucher);
  }
  const u = db.users.find(x => x.user === db.session.user);
  if (u) { u.address = addr; u.phone = phone; u.name = name; }
  db.cart = [];
  checkout.voucherOn = false;
  persist();
  toast("Đặt hàng thành công. Mã đơn: " + order.ma);
  view = "orders";
  render();
}

function filtered() {
  const q = keyword.toLowerCase();
  return db.products.filter(p => p.active &&
    (catFilter === "Tất cả" || p.cat === catFilter) &&
    (!q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q))
  );
}

function pic(src, alt, cls) {
  return `<img class="${cls || ""}" src="${src}" alt="${esc(alt || "")}" onerror="this.onerror=null;this.src=productArt({name:this.alt,emoji:'🥗',cat:'Rau củ'})">`;
}

function productCard(p) {
  return `<article class="p-card" onclick="nav('detail',{id:${p.id}})">
    ${pic(p.img, p.name, "pic")}
    <div class="body">
      <small>${esc(p.cat)}</small>
      <h3>${esc(p.name)}</h3>
      <div class="price">${vnd(p.price)} / ${esc(p.unit)}</div>
      <button class="btn" onclick="event.stopPropagation();addCart(${p.id})">Thêm giỏ</button>
    </div>
  </article>`;
}

function logo() {
  return `<span class="brand" onclick="nav('${isAdmin() ? "admin" : "home"}')">${LOGO_SVG} Chợ Nhà Smart Food</span>`;
}

function renderAuth() {
  const reg = view === "register";
  return `
  <div class="auth-page">
    <aside class="auth-hero">
      <div class="auth-orb" style="width:120px;height:120px;right:-20px;top:50px"></div>
      <div class="auth-orb" style="width:160px;height:160px;left:-40px;bottom:40px;animation-delay:-2s"></div>
      ${reg ? `
        <div class="eyebrow" style="color:#fff;background:rgba(255,255,255,.18);display:inline-block;padding:6px 10px;border-radius:6px">Đặc quyền thành viên mới</div>
        <h1 style="font-size:26px;margin-top:12px">Gia nhập Chợ Nhà<br>Thực phẩm sạch<br>tận bếp gia đình</h1>
        <p>Nhận gói quà tân thủ 500.000đ và nông sản hữu cơ chuẩn Nhật.</p>
        <div class="auth-gift">
          <div style="display:flex;justify-content:space-between;font-weight:700;color:#0b5c32"><span>Quà tặng kích hoạt</span><span style="color:#ef9900">500.000đ</span></div>
          <div class="gift-row"><span class="badge">50k</span> Giảm 50.000đ đơn đầu · CHONHA50K</div>
          <div class="gift-row"><span class="badge">2H</span> Freeship 30.000đ · FREESHIP2H</div>
          <div class="gift-row"><span class="badge">AI</span> 7 ngày dùng thử trợ lý Smart Food</div>
        </div>
      ` : `
        <h1>Chợ Nhà</h1>
        <div class="tag">Smart Food  ·  Organic</div>
        <p>Thực phẩm tươi lành mỗi ngày cho tổ ấm.<br>Nguồn gốc rõ ràng — giao tận bếp trong 2 giờ.</p>
        <div class="hero-chip">100% VietGAP & hữu cơ</div>
        <div class="hero-chip">Thịt tươi mổ sáng mỗi ngày</div>
        <div class="hero-chip">Hoàn 100% tiền trong 24H</div>
        <p style="margin-top:28px;color:#ffdda0;font-weight:650">Ưu đãi thành viên mới · Gói quà 150.000đ</p>
      `}
    </aside>
    <div class="auth-card">
      ${reg ? `
        <h2>Tạo tài khoản mới</h2>
        <p class="muted">Đăng ký để đi chợ sạch cùng trợ lý AI.</p>
        <form onsubmit="register(event)">
          <div class="field"><label>Họ tên</label><input id="reg-name" required></div>
          <div class="field"><label>Số điện thoại</label><input id="reg-phone"></div>
          <div class="field"><label>Email</label><input id="reg-email" type="email"></div>
          <div class="field"><label>Tên đăng nhập</label><input id="reg-user" required></div>
          <div class="field"><label>Mật khẩu</label><input id="reg-pass" type="password" required></div>
          <div class="field"><label>Nhập lại mật khẩu</label><input id="reg-pass2" type="password" required></div>
          <label class="chk"><input type="checkbox" id="reg-terms"> Đồng ý điều khoản thành viên Chợ Nhà</label>
          <div class="err" id="reg-err"></div>
          <button class="btn green xl block">Đăng ký</button>
        </form>
        <p>Đã có tài khoản? <a href="#" onclick="view='login';render();return false" style="color:var(--primary);font-weight:700">Đăng nhập</a></p>
        <p><a href="#" onclick="view='home';render();return false">← Xem sản phẩm không cần đăng nhập</a></p>
      ` : `
        <h2>Chào mừng đến với Chợ Nhà</h2>
        <p class="muted">${pendingLogin?.msg ? esc(pendingLogin.msg) : "Đăng nhập để mua hàng. Bạn vẫn xem sản phẩm khi chưa đăng nhập."}</p>
        <form onsubmit="login(event)">
          <div class="field"><label>Tên đăng nhập / Email</label><input id="login-user" value="customer"></div>
          <div class="field"><label>Mật khẩu</label><input id="login-pass" type="password" value="Customer@123"></div>
          <label class="chk"><input type="checkbox" onchange="document.getElementById('login-pass').type=this.checked?'text':'password'"> Hiện mật khẩu</label>
          <div class="err" id="login-err"></div>
          <button class="btn green xl block">Đăng nhập</button>
        </form>
        <p>Chưa có tài khoản? <a href="#" onclick="view='register';render();return false" style="color:var(--primary);font-weight:700">Đăng ký ngay</a></p>
        <p><a href="#" onclick="view='home';render();return false">← Xem sản phẩm không cần đăng nhập</a></p>
      `}
    </div>
  </div>`;
}

function customerShell(inner) {
  const me = db.session;
  const accountBtn = me
    ? `<button class="btn ghost" onclick="nav('account')" style="gap:8px">${(() => { const u = db.users.find(x => x.user === me.user) || {}; return avatarHtml(u, 28) + " " + esc(me.name); })()}</button>`
    : `<button class="btn" onclick="nav('login')">Đăng nhập</button><button class="btn ghost" onclick="nav('register')">Đăng ký</button>`;
  return `
  <header class="shell-top">
    <div class="header">
      ${logo()}
      <form class="search" onsubmit="doSearch(event)">
        <input id="q" placeholder="Tìm sản phẩm..." value="${esc(keyword)}">
        <button class="btn">Tìm</button>
      </form>
      <div class="header-right">
        <div class="cart-host">
          <button class="btn ghost" onclick="nav('cart')">Giỏ hàng</button>
          ${cartCount() ? `<span class="cart-badge">${cartCount() > 99 ? "99+" : cartCount()}</span>` : ""}
        </div>
        ${accountBtn}
      </div>
    </div>
    <nav class="nav-bar">
      ${NAV_CUSTOMER.map(([k, t]) => `<button class="nav-btn ${view === k || (k === "products" && view === "detail") ? "on" : ""}" onclick="nav('${k}')">${t}</button>`).join("")}
      ${me ? `<button class="nav-btn" onclick="logout()">Đăng xuất</button>` : ""}
    </nav>
  </header>
  <main>${inner}</main>
  <footer class="site">Chợ Nhà Smart Food · Thực phẩm sạch tận bếp · Giao 2H · Tổng đài 1900 6868</footer>`;
}

function renderHome() {
  const best = db.products.filter(p => p.active).slice(0, 4);
  const meals = db.products.filter(p => p.active).slice(5, 8);
  const cats = db.categories.filter(c => c.active);
  return `<div class="wrap page">
    <section class="hero-home">
      <div>
        <div class="eyebrow">Ưu đãi đặc biệt cho thành viên mới</div>
        <h1 style="color:var(--green-dark);font-size:28px">${db.session ? `Chào mừng ${esc(db.session.name)} đến với Chợ Nhà!` : "Chào mừng đến với Chợ Nhà!"}</h1>
        <p class="muted">${db.session ? "Thực phẩm sạch lạnh mồ mỗi ngày cho tổ ấm của bạn.<br>Nguồn gốc rõ ràng từ nông trại VietGAP, giao tận bếp giờ trong đô thị." : "Xem sản phẩm tự do. Đăng nhập khi muốn thêm vào giỏ và thanh toán."}</p>
        <div class="pills">
          <span class="pill">100% Rau chuẩn VietGAP & GlobalGAP</span>
          <span class="pill">Tươi từ nông sản mỗi ngày</span>
          <span class="pill">Hoàn 100% tiền trong 24H</span>
        </div>
        <div class="hero-actions">
          <button class="btn ghost lg" onclick="nav('products')">Nhận trọn bộ quà tặng ngay</button>
          <button class="btn lg" onclick="nav('products')">Bắt đầu khám phá</button>
        </div>
      </div>
      <div class="gift-card">
        <h3>Gói Quà Tân Thủ <span>Trị giá 150.000đ</span></h3>
        <div class="mint-row"><span class="badge">50k</span> Giảm 50.000đ đơn hàng đầu tiên · CHONHA50K</div>
        <div class="mint-row"><span class="badge">2H</span> Freeship 30.000đ đơn từ 2H · FREESHIP2H</div>
        <div class="mint-row"><span class="badge">30k</span> Voucher 30.000đ đơn thứ 2 · THANHVIEN30</div>
        <button class="btn ghost block" onclick="nav('voucher')">Chưa kích hoạt</button>
      </div>
    </section>

    <div class="steps">
      <div class="eyebrow">Trải nghiệm mua sắm thông minh</div>
      <h2>Đi chợ tiện lợi chỉ với 3 bước đơn giản</h2>
      <div class="step-grid">
        <div class="card"><div class="step-no">01</div><h3>Nông trại chuẩn sạch</h3><p class="muted">Khách hàng lựa chọn rau củ, thịt cá tươi từ hơn 40 trang trại tinh hoa đạt các giấy chứng nhận kiểm định nghiêm ngặt.</p></div>
        <div class="card" style="cursor:pointer" onclick="openAi('Mâm cơm gia đình 4 người, ngân sách 200.000đ, vị Bắc')"><div class="step-no">02</div><h3>Gợi ý thực đơn AI</h3><p class="muted">Trợ lý Smart Food AI tính toán định lượng calo, cân đối dinh dưỡng và gợi ý combo món ăn theo ngân sách mỗi người.</p></div>
        <div class="card"><div class="step-no">03</div><h3>Giao tận bếp trong 2H</h3><p class="muted">Đóng thùng giữ nhiệt chuyên dụng, đội ngũ shipper có lạnh hỗ trợ giao tới giờ giấc tự chọn.</p></div>
      </div>
    </div>

    <section class="ai-banner">
      <div>
        <span class="ai-badge">Trợ lý AI ăn uống Chợ Nhà AI</span>
        <p class="muted" style="font-style:italic">“Chào bạn! Hãy cho AI biết gia đình bạn có mấy người và sở thích ăn hôm nay. AI sẽ chọn hành trình dinh dưỡng phù hợp.”</p>
        <h2 style="color:var(--green-dark)">Gợi ý: Mâm cơm gia đình chuẩn vị Bắc</h2>
        <p class="muted">4 người  ·  Ngân sách 145.000đ  ·  32 phút nấu</p>
        <button class="btn lg" onclick="openAi('Mâm cơm gia đình 4 người, ngân sách 200.000đ, vị Bắc')">Lấy trọn mâm cơm này</button>
      </div>
      <div>${meals.map(p => `<div class="meal-row" onclick="nav('detail',{id:${p.id}})">${pic(p.img, p.name)}<div style="flex:1"><b>${esc(p.name)}</b></div><span class="price">${vnd(p.price)}</span></div>`).join("")}</div>
    </section>

    <div class="section-head">
      <div><div class="eyebrow">Lựa chọn nông sản</div><h2>Combo khởi đầu bán chạy nhất</h2></div>
      <button class="btn ghost" onclick="nav('products')">Xem tất cả sản phẩm</button>
    </div>
    <div class="prod-grid">${best.map(productCard).join("")}</div>

    <div style="margin-top:22px">
      <div class="eyebrow">Danh mục nổi bật</div>
      <h2>Chọn nhanh theo nhu cầu bữa ăn</h2>
      <div class="cat-grid">${cats.map(c => `<div class="cat-card" onclick="nav('products',{cat:'${esc(c.name)}'})"><div class="cat-ico">${c.ico}</div><b>${esc(c.name)}</b><div class="muted" style="font-size:12px">${esc(c.desc)}</div></div>`).join("")}</div>
    </div>

    <div style="margin-top:22px">
      <div class="eyebrow">Khách hàng tin tưởng</div>
      <h2>Đánh giá thực tế từ hơn 10.000+ tổ ấm</h2>
      <div class="review-grid">${LANDING_REVIEWS.map(r => `<div class="card"><b>${esc(r.name)}</b><div class="stars">${esc(r.stars)}</div><p class="muted">${esc(r.text)}</p><div class="price" style="font-size:12px">${esc(r.tag)}</div></div>`).join("")}</div>
    </div>

    <div class="trust-grid" style="margin-top:18px">
      ${[
        ["Chuẩn VietGAP & GlobalGAP", "Rau củ được kiểm định nghiêm ngặt từ nông trại đối tác."],
        ["100% Organic / Tự nhiên", "Cam kết không chất bảo quản, truy xuất nguồn gốc rõ ràng."],
        ["Hoàn tiền 100% trong 24H", "Không hài lòng về độ tươi? Chúng tôi hoàn tiền ngay."],
        ["Tổng đài chăm sóc 24/7", "1900 6868  ·  Luôn sẵn sàng hỗ trợ đơn hàng của bạn."]
      ].map(([t, b]) => `<div class="card"><b style="color:var(--green-dark)">${t}</b><p class="muted">${b}</p></div>`).join("")}
    </div>
  </div>`;
}

function renderProducts() {
  const list = filtered();
  const cats = ["Tất cả", ...db.categories.filter(c => c.active).map(c => c.name)];
  return `<div class="wrap page">
    <h2>Sản phẩm</h2>
    <p class="muted">${list.length} sản phẩm · Giao lạnh 2H</p>
    <div class="nav-bar" style="padding-left:0;background:transparent">
      ${cats.map(c => `<button class="nav-btn ${c === catFilter ? "on" : ""}" onclick="setCat(this.dataset.cat)" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}
    </div>
    <div class="prod-grid">${list.map(productCard).join("") || "<p>Không tìm thấy sản phẩm.</p>"}</div>
  </div>`;
}

function renderDetail() {
  const p = product(detailId);
  if (!p) return renderProducts();
  const related = db.products.filter(x => x.active && x.cat === p.cat && x.id !== p.id).slice(0, 4);
  return `<div class="wrap page">
    <button class="btn ghost" onclick="nav('products')">← Quay lại sản phẩm</button>
    <div class="detail" style="margin-top:14px">
      ${pic(p.img, p.name)}
      <div>
        <div class="eyebrow">${esc(p.cat)}</div>
        <h1>${esc(p.name)}</h1>
        <div class="price" style="font-size:26px">${vnd(p.price)} / ${esc(p.unit)}</div>
        <p class="muted">${esc(p.desc)}</p>
        <p>Xuất xứ: <b>${esc(p.origin)}</b> · Tồn kho: <b>${p.stock}</b></p>
        <div class="qty" style="margin:14px 0">
          <button class="btn ghost" onclick="qtyPick=Math.max(1,qtyPick-1);render()">−</button>
          <b>${qtyPick}</b>
          <button class="btn ghost" onclick="qtyPick++;render()">+</button>
        </div>
        <button class="btn lg" onclick="addCart(${p.id}, qtyPick)">Thêm vào giỏ</button>
      </div>
    </div>
    <h2 style="margin-top:22px">Sản phẩm cùng danh mục</h2>
    <div class="prod-grid">${related.map(productCard).join("")}</div>
  </div>`;
}

function renderCart() {
  const t = totals();
  return `<div class="wrap page layout-2">
    <div class="card">
      <h2>Giỏ hàng của bạn</h2>
      ${db.cart.length === 0 ? `<p>Chưa có sản phẩm.</p><button class="btn" onclick="nav('products')">Xem tất cả sản phẩm</button>` :
        db.cart.map(x => `<div class="cart-item">
          <span onclick="nav('detail',{id:${x.id}})">${pic(x.img, x.name)}</span>
          <div><b>${esc(x.name)}</b><div class="price">${vnd(x.price)} / ${esc(x.unit)}</div>
            <div class="qty"><button class="btn ghost sm" onclick="setQty(${x.id},-1)">−</button>${x.qty}<button class="btn ghost sm" onclick="setQty(${x.id},1)">+</button></div>
          </div>
          <b>${vnd(x.price * x.qty)}</b>
        </div>`).join("")}
    </div>
    <aside class="card summary">
      <h3>Tóm tắt đơn</h3>
      <div class="row"><span>Tạm tính (${t.n} món)</span><b>${vnd(t.sub)}</b></div>
      <div class="row"><span>Khuyến mãi shop</span><b>${t.shop ? "-" + vnd(t.shop) : "0đ"}</b></div>
      <div class="row"><span>Phí giao bảo ôn</span><b>${checkout.express ? "Hỏa tốc 2H" : vnd(SLOT_FEE)}</b></div>
      <div class="row"><span>Tổng</span><b class="price">${vnd(Math.max(0, t.sub - t.shop))}</b></div>
      <button class="btn block lg" ${db.cart.length ? "" : "disabled"} onclick="nav('checkout')">Tiến hành đặt hàng</button>
    </aside>
  </div>`;
}

function setCat(c) {
  catFilter = c;
  render();
}

function tryVoucher() {
  const code = $("ck-voucher").value;
  const r = applyVoucherCode(code, subtotal());
  checkout.voucherOn = !!r.ok;
  checkout.voucher = r.ok ? code.trim().toUpperCase() : "";
  checkout.voucherOff = r.off || 0;
  checkout.voucherShip = !!r.ship;
  checkout.voucherHint = r.msg;
  checkout.voucherOk = !!r.ok;
  render();
}

function renderCheckout() {
  const u = db.users.find(x => x.user === db.session.user) || {};
  const t = totals();
  const w = walletOf(db.session.user);
  return `<div class="wrap page layout-2">
    <form class="card" onsubmit="doCheckout(event)">
      <h2>Thanh toán</h2>
      <div class="field"><label>Họ tên</label><input id="ck-name" value="${esc(u.name || db.session.name)}"></div>
      <div class="field"><label>Số điện thoại</label><input id="ck-phone" value="${esc(u.phone || "")}"></div>
      <div class="field"><label>Địa chỉ nhận hàng</label><textarea id="ck-addr">${esc(u.address || "")}</textarea></div>
      <div class="field"><label>Ghi chú</label><input id="ck-note" placeholder="Giao giờ trưa, gọi trước khi lên..."></div>
      <h3>Vận chuyển bảo ôn</h3>
      <div class="ship-opt ${checkout.express ? "on" : ""}" onclick="checkout.express=true;render()">
        <b>Hỏa tốc 2H</b> · niêm yết ${vnd(EXPRESS_FEE)} · Freeship Xtra
      </div>
      <div class="ship-opt ${!checkout.express ? "on" : ""}" onclick="checkout.express=false;render()">
        <b>Hẹn khung giờ</b> · ${vnd(SLOT_FEE)}
        <select onchange="checkout.slot=this.value" onclick="event.stopPropagation()">
          <option ${checkout.slot.includes("18") ? "selected" : ""}>Giao 18:00 – 20:00</option>
          <option>Giao 11:00 – 13:00</option>
          <option>Giao 07:00 – 09:00</option>
        </select>
      </div>
      <h3>Thanh toán</h3>
      <div class="pay-opt">
        ${["COD", "VNPAY-QR", "MOMO"].map(p => `<button type="button" class="btn ${checkout.pay === p ? "" : "ghost"}" onclick="checkout.pay='${p}';render()">${p}</button>`).join("")}
      </div>
      <div class="field"><label>Mã voucher</label>
        <div style="display:flex;gap:8px"><input id="ck-voucher" value="${esc(checkout.voucher)}" placeholder="CHONHA / CHONHAMOI">
        <button type="button" class="btn ghost" onclick="tryVoucher()">Áp dụng</button></div>
        <div id="ck-vhint" class="${checkout.voucherOk === false ? "err" : "ok"}">${esc(checkout.voucherHint || "Thử CHONHAMOI, CHONHA")}</div>
      </div>
      <label class="chk"><input type="checkbox" ${checkout.usePts ? "checked" : ""} onchange="checkout.usePts=this.checked;render()"> Dùng ${w.points || 0} điểm thưởng (1.000đ = 1 điểm)</label>
      <div class="err" id="ck-err"></div>
      <button class="btn green xl block">ĐẶT HÀNG NGAY · ${vnd(t.total)}</button>
    </form>
    <aside class="card summary">
      <h3>Tóm tắt</h3>
      <div class="row"><span>Tổng tiền hàng (${t.n} món)</span><b>${vnd(t.sub)}</b></div>
      <div class="row"><span>Khuyến mãi shop</span><b>${t.shop ? "-" + vnd(t.shop) : "0đ"}</b></div>
      <div class="row"><span>Phí vận chuyển bảo ôn</span><b>${t.ship ? vnd(t.ship) : "Miễn phí"}</b></div>
      <div class="row"><span>Freeship Xtra</span><b>${t.free ? "-" + vnd(t.free) : "0đ"}</b></div>
      <div class="row"><span>Voucher Chợ Nhà</span><b>${t.voucher ? "-" + vnd(t.voucher) : "0đ"}</b></div>
      <div class="row"><span>Điểm thưởng</span><b>${t.reward ? "-" + vnd(t.reward) : "0đ"}</b></div>
      <div class="row"><span>Tổng</span><b class="total">${vnd(t.total)}</b></div>
      <p class="ok">${t.saved ? "Bạn tiết kiệm được " + vnd(t.saved) + " cho đơn này!" : "Chọn voucher để tiết kiệm thêm."}</p>
    </aside>
  </div>`;
}

function statusClass(st) {
  if (st.includes("Chờ")) return "wait";
  if (st.includes("giao") || st.includes("Giao")) return "ship";
  if (st.includes("Huỷ") || st.includes("Hủy")) return "cancel";
  return "done";
}

function renderOrders() {
  const mine = db.orders.filter(o => o.user === db.session.user);
  return `<div class="wrap page">
    <h2>Đơn hàng của bạn</h2>
    ${mine.length === 0 ? "<div class='card'><p>Chưa có đơn.</p><button class='btn' onclick=\"nav('products')\">Mua sắm ngay</button></div>" :
      mine.map(o => `<div class="order-card">
        <div class="row" style="display:flex;justify-content:space-between"><div><b>${o.ma}</b> · ${esc(o.when)}</div><span class="status ${statusClass(o.status)}">${esc(o.status)}</span></div>
        <p class="muted">${o.items.map(i => esc(i.name) + " x" + i.qty).join(", ")}</p>
        <p>${esc(o.addr)} · ${esc(o.pay)}</p>
        <b class="price">${vnd(o.total)}</b>
        ${o.status === "Hoàn thành" ? `<button class="btn ghost" onclick="nav('reviews')">Đánh giá</button>` : ""}
      </div>`).join("")}
  </div>`;
}

function avatarHtml(u, size) {
  const s = size || 72;
  if (u.avatar) return `<img class="avatar" src="${u.avatar}" alt="" style="width:${s}px;height:${s}px">`;
  return `<div class="avatar empty" style="width:${s}px;height:${s}px">👤</div>`;
}

function renderAccount() {
  const u = db.users.find(x => x.user === db.session.user) || {};
  const w = walletOf(db.session.user);
  const spent = db.orders.filter(o => o.user === db.session.user && o.status !== "Đã hủy").reduce((s, o) => s + o.total, 0);
  const next = Math.max(0, 2000000 - spent);
  const pct = Math.min(100, Math.round(spent / 20000) / 10);
  const tabs = [["profile", "Hồ sơ"], ["address", "Địa chỉ"], ["pass", "Mật khẩu"], ["orders", "Đơn hàng"]];
  return `<div class="wrap page account">
    <aside class="card">
      <div class="side-profile">
        ${avatarHtml(u, 96)}
        <b>${esc(u.name)}</b>
        <div class="muted">${esc(u.email || u.user)}</div>
        <div class="price">Thành viên ${spent >= 500000 ? "GOLD MEMBER" : "Mới"}</div>
        <label class="btn block" style="margin-top:12px">Đổi ảnh từ máy tính
          <input type="file" accept="image/jpeg,image/png,image/bmp,image/webp" hidden onchange="pickAvatar(event)">
        </label>
        <button type="button" class="linkish" onclick="accountTab='profile';render()">Sửa hồ sơ nhanh</button>
        ${u.avatar ? `<button type="button" class="linkish" onclick="clearAvatar()">Xóa ảnh</button>` : ""}
      </div>
      <div class="side-menu" style="margin-top:12px">
        ${tabs.map(([k, t]) => `<button class="${accountTab === k ? "on" : ""}" onclick="accountTab='${k}';render()">${t}</button>`).join("")}
        <button onclick="nav('ai')">Trợ lý AI</button>
        <button onclick="logout()">Đăng xuất</button>
      </div>
    </aside>
    <div>
      <div class="vip">
        <div class="eyebrow" style="color:#fff">VIP Chợ Nhà</div>
        <h2 style="color:#fff">${esc(u.name)}</h2>
        <p>${w.points || 0} điểm · Đã chi ${vnd(spent)}</p>
        <p style="opacity:.9">Còn ${vnd(next)} nữa lên Platinum</p>
        <div class="vip-bar"><span style="width:${pct}%"></span></div>
      </div>
      ${accountTab === "orders" ? renderOrders().replace('<div class="wrap page">', "<div>") :
      accountTab === "pass" ? `<div class="card"><h3>Đổi mật khẩu</h3>
        <div class="field"><label>Mật khẩu cũ</label><input id="old-pass" type="password"></div>
        <div class="field"><label>Mật khẩu mới</label><input id="new-pass" type="password"></div>
        <button class="btn" onclick="changePass()">Lưu</button></div>` :
      accountTab === "address" ? `<div class="card"><h3>Địa chỉ giao hàng</h3>
        <div class="field"><label>Địa chỉ</label><textarea id="acc-addr">${esc(u.address || "")}</textarea></div>
        <button class="btn" onclick="saveAccount()">Lưu địa chỉ</button></div>` :
      `<div class="card profile-grid">
        <div>
          <h3>Hồ sơ</h3>
          <div class="field"><label>Họ tên</label><input id="acc-name" value="${esc(u.name || "")}"></div>
          <div class="field"><label>Email</label><input id="acc-email" value="${esc(u.email || "")}"></div>
          <div class="field"><label>Số điện thoại</label><input id="acc-phone" value="${esc(u.phone || "")}"></div>
          <div class="field"><label>Giới tính</label>
            <select id="acc-gender">
              ${["Nam", "Nữ", "Khác"].map(g => `<option ${u.gender === g ? "selected" : ""}>${g}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Ngày sinh</label><input id="acc-birth" type="date" value="${esc(u.birth || "")}"></div>
          <div class="field"><label>Ngân sách bữa ăn (đ)</label><input id="acc-budget" type="number" value="${u.budget || 200000}"></div>
          <button class="btn" onclick="saveAccount()">Lưu hồ sơ</button>
        </div>
        <div class="photo-card">
          ${avatarHtml(u, 140)}
          <label class="btn ghost block" style="margin-top:12px">Chọn ảnh từ máy
            <input type="file" id="acc-photo" accept="image/jpeg,image/png,image/bmp,image/webp" hidden onchange="pickAvatar(event)">
          </label>
          <p class="muted" style="font-size:12px;margin-top:8px">JPG, PNG, BMP · tối đa khoảng 800KB</p>
          ${u.avatar ? `<button class="btn ghost sm" onclick="clearAvatar()">Xóa ảnh</button>` : ""}
        </div>
      </div>`}
    </div>
  </div>`;
}

function saveAccount() {
  const u = db.users.find(x => x.user === db.session.user);
  if (!u) return;
  if ($("acc-name")) u.name = $("acc-name").value.trim();
  if ($("acc-email")) u.email = $("acc-email").value.trim();
  if ($("acc-phone")) u.phone = $("acc-phone").value.trim();
  if ($("acc-budget")) u.budget = Number($("acc-budget").value) || 0;
  if ($("acc-addr")) u.address = $("acc-addr").value.trim();
  if ($("acc-gender")) u.gender = $("acc-gender").value;
  if ($("acc-birth")) u.birth = $("acc-birth").value;
  db.session.name = u.name;
  persist();
  toast("Đã lưu thông tin tài khoản.");
  render();
}

function changePass() {
  const u = db.users.find(x => x.user === db.session.user);
  if ($("old-pass").value !== u.pass) return toast("Mật khẩu cũ không đúng.");
  if (($("new-pass").value || "").length < 6) return toast("Mật khẩu mới tối thiểu 6 ký tự.");
  u.pass = $("new-pass").value;
  persist();
  toast("Đã đổi mật khẩu.");
}

function pickAvatar(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) return toast("Ảnh quá lớn. Chọn file dưới 2MB.");
  const img = new Image();
  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      const c = document.createElement("canvas");
      const size = 240;
      c.width = size; c.height = size;
      const ctx = c.getContext("2d");
      const m = Math.min(img.width, img.height);
      const sx = (img.width - m) / 2, sy = (img.height - m) / 2;
      ctx.drawImage(img, sx, sy, m, m, 0, 0, size, size);
      const u = db.users.find(x => x.user === db.session.user);
      u.avatar = c.toDataURL("image/jpeg", 0.82);
      persist();
      toast("Đã cập nhật ảnh đại diện.");
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function clearAvatar() {
  const u = db.users.find(x => x.user === db.session.user);
  if (!u) return;
  u.avatar = "";
  persist();
  render();
}

function renderReviews() {
  const mine = db.reviews.filter(r => r.user === db.session.user);
  const byProduct = Object.fromEntries(mine.map(r => [r.productId, r]));
  let list = db.products.filter(p => p.active);
  if (reviewCat !== "Tất cả") list = list.filter(p => p.cat === reviewCat);
  const q = reviewKw.toLowerCase();
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q));
  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  if (reviewPage > pages) reviewPage = pages;
  const slice = list.slice((reviewPage - 1) * pageSize, reviewPage * pageSize);
  const nSel = Object.keys(reviewSelected).length;
  const cats = ["Tất cả", ...db.categories.filter(c => c.active).map(c => c.name)];
  return `<div class="wrap page">
    <h2>Đánh giá sản phẩm</h2>
    <div class="rev-tools">
      <input id="rev-q" placeholder="Tìm sản phẩm để đánh giá..." value="${esc(reviewKw)}" onkeydown="if(event.key==='Enter'){reviewKw=this.value.trim();reviewPage=1;render()}">
      <select id="rev-cat" onchange="reviewCat=this.value;reviewPage=1;render()">
        ${cats.map(c => `<option ${c === reviewCat ? "selected" : ""}>${esc(c)}</option>`).join("")}
      </select>
      <button class="btn ghost" onclick="reviewKw=$('rev-q').value.trim();reviewPage=1;render()">Lọc</button>
    </div>
    <div class="rev-grid">
      ${slice.map(p => {
        const on = !!reviewSelected[p.id];
        const done = byProduct[p.id];
        return `<article class="rev-card ${on ? "on" : ""}" onclick="toggleReviewPick(${p.id})">
          <input type="checkbox" ${on ? "checked" : ""} onclick="event.stopPropagation();toggleReviewPick(${p.id})">
          ${pic(p.img, p.name, "pic")}
          <small>${esc(p.cat)}</small>
          <h3>${esc(p.name)}</h3>
          <div class="${done ? "stars" : "muted"}">${done ? "★".repeat(done.stars) + "☆".repeat(5 - done.stars) : "Chưa đánh giá"}</div>
          <div class="muted" style="font-size:12px">Bấm để chọn</div>
        </article>`;
      }).join("") || "<p>Không tìm thấy sản phẩm</p>"}
    </div>
    <div class="pager">
      <button class="btn ghost" ${reviewPage <= 1 ? "disabled" : ""} onclick="reviewPage--;render()">‹ Trước</button>
      <span>Trang ${reviewPage} / ${pages}</span>
      <button class="btn ghost" ${reviewPage >= pages ? "disabled" : ""} onclick="reviewPage++;render()">Sau ›</button>
      <button class="btn" ${nSel ? "" : "disabled"} onclick="openReviewDraft()">${nSel ? "Viết đánh giá (" + nSel + ")" : "Viết đánh giá"}</button>
    </div>
    ${reviewDraft ? renderReviewModal() : ""}
  </div>`;
}

function toggleReviewPick(id) {
  if (reviewSelected[id]) delete reviewSelected[id];
  else reviewSelected[id] = true;
  render();
}

function openReviewDraft() {
  const ids = Object.keys(reviewSelected).map(Number);
  if (!ids.length) return toast("Hãy chọn một hoặc nhiều sản phẩm để đánh giá.");
  reviewDraft = ids.map(id => ({ id, stars: 5, text: "" }));
  render();
}

function renderReviewModal() {
  return `<div class="modal" onclick="if(event.target===this){reviewDraft=null;render()}">
    <div class="card modal-card">
      <h3>Viết đánh giá</h3>
      ${reviewDraft.map((d, i) => {
        const p = product(d.id);
        return `<div class="draft-row">
          ${pic(p.img, p.name, "thumb")}
          <div style="flex:1">
            <b>${esc(p.name)}</b>
            <div class="star-pick">${[1,2,3,4,5].map(s => `<button type="button" class="star ${d.stars >= s ? "on" : ""}" onclick="keepReviewTexts();reviewDraft[${i}].stars=${s};render()">★</button>`).join("")}</div>
            <textarea id="rev-text-${i}" placeholder="Cảm nhận của bạn...">${esc(d.text)}</textarea>
          </div>
        </div>`;
      }).join("")}
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" onclick="reviewDraft=null;render()">Hủy</button>
        <button class="btn" onclick="submitReviews()">Gửi đánh giá</button>
      </div>
    </div>
  </div>`;
}

function keepReviewTexts() {
  (reviewDraft || []).forEach((d, i) => {
    const el = $("rev-text-" + i);
    if (el) d.text = el.value;
  });
}

function submitReviews() {
  keepReviewTexts();
  if (!reviewDraft?.length) return;
  reviewDraft.forEach((d, i) => {
    const p = product(d.id);
    const text = ($("rev-text-" + i)?.value || "").trim() || "Sản phẩm tốt.";
    db.reviews = db.reviews.filter(r => !(r.user === db.session.user && r.productId === d.id));
    db.reviews.unshift({ id: Date.now() + i, productId: d.id, name: p.name, user: db.session.user, stars: d.stars, text, when: new Date().toLocaleString("vi-VN") });
  });
  reviewSelected = {};
  reviewDraft = null;
  persist();
  toast("Cảm ơn bạn đã đánh giá.");
  render();
}

function renderVoucher() {
  const w = walletOf(db.session.user);
  return `<div class="wrap page">
    <div class="card" style="background:linear-gradient(90deg,#0b5c32,#22c55e);color:#fff">
      <h2 style="color:#fff">Vòng quay nông sản vàng — 100% quay là trúng!</h2>
      <p>Săn voucher tươi sạch, freeship 2H và Xu Chợ Nhà.</p>
      <p><b>${w.xu} Xu</b> · <b>${w.spins} lượt quay</b></p>
    </div>
    <div class="ticker">Minh Anh vừa trúng Voucher 20k · Huyền trúng Freeship 2H · Đức +200 Xu</div>
    <div class="wheel-row">
      <div class="card wheel-wrap">
        <h3>Vòng xoay nông sản</h3>
        <p class="muted">Chạm QUAY NGAY để thử vận may tươi sạch hôm nay.</p>
        <div class="pointer"></div>
        <canvas id="wheel" width="320" height="320"></canvas>
        <button class="btn accent lg" onclick="spinWheel()" ${wheelBusy ? "disabled" : ""}>QUAY NGAY</button>
      </div>
      <div class="card">
        <h3>Nhiệm vụ kiếm lượt</h3>
        <div class="mint-row"><span>Điểm danh ngày · +1 lượt quay</span><button class="btn sm" onclick="checkIn()">Nhận</button></div>
        <div class="mint-row"><span>Đổi 100 Xu · +1 lượt quay</span><button class="btn sm" onclick="buySpin()">Nhận</button></div>
        <div class="mint-row"><span>Mua đơn từ 199.000đ · +2 lượt</span><button class="btn ghost sm" onclick="nav('products')">Mua ngay</button></div>
        <h3 style="margin-top:16px">Kho voucher</h3>
        ${(w.vouchers || []).length === 0 ? "<p class='muted'>Chưa có voucher. Hãy quay thưởng hoặc đổi Xu!</p>" :
          w.vouchers.map(v => `<div class="mint-row"><b>${esc(v.code || v.title)}</b> · ${esc(v.title)}</div>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Bảng đổi Xu thành voucher</h3>
      <p class="muted">Chọn mốc Xu, bấm Đổi ngay. Mã sẽ vào kho quà phía trên. Bạn đang có <b>${w.xu} Xu</b>.</p>
      <div class="table-wrap">
        <table>
          <tr><th>Xu cần</th><th>Voucher nhận được</th><th>Đơn tối thiểu</th><th>Hạn dùng</th><th></th></tr>
          ${XU_CATALOG.map(o => `<tr>
            <td>${o.xu.toLocaleString("en-US")} Xu</td>
            <td>${esc(o.title)}</td>
            <td>${o.min ? vnd(o.min) : "Không tối thiểu"}</td>
            <td>${o.days} ngày</td>
            <td><button class="btn ghost sm" onclick="exchangeXu('${o.id}')">Đổi ngay</button></td>
          </tr>`).join("")}
        </table>
      </div>
    </div>
  </div>`;
}

function drawWheel() {
  const c = $("wheel");
  if (!c) return;
  const ctx = c.getContext("2d");
  const n = prizes().length;
  const r = 150;
  ctx.clearRect(0, 0, 320, 320);
  ctx.save();
  ctx.translate(160, 160);
  ctx.rotate(wheelAngle);
  prizes().forEach((p, i) => {
    const a0 = i * 2 * Math.PI / n;
    const a1 = (i + 1) * 2 * Math.PI / n;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, a0, a1);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Segoe UI";
    ctx.save();
    ctx.rotate((a0 + a1) / 2);
    ctx.fillText(p.title, 45, 4);
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();
}

function pickPrize() {
  const list = prizes();
  const total = list.reduce((s, p) => s + Math.max(0, p.weight), 0);
  let r = Math.random() * Math.max(1, total);
  for (let i = 0; i < list.length; i++) {
    r -= Math.max(0, list[i].weight);
    if (r <= 0) return i;
  }
  return list.length - 1;
}

function spinWheel() {
  const w = walletOf(db.session.user);
  if (wheelBusy) return;
  if (w.spins <= 0) return toast("Hết lượt quay. Điểm danh hoặc mua đơn để nhận thêm.");
  wheelBusy = true;
  w.spins--;
  const idx = pickPrize();
  const n = prizes().length;
  const slice = 2 * Math.PI / n;
  const target = (3 * Math.PI / 2) - (idx + 0.5) * slice + Math.PI * 8;
  const start = wheelAngle;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - t0) / 3200);
    const ease = 1 - Math.pow(1 - p, 3);
    wheelAngle = start + (target - start) * ease;
    drawWheel();
    if (p < 1) requestAnimationFrame(tick);
    else {
      wheelBusy = false;
      grantPrize(prizes()[idx]);
      persist();
      render();
    }
  }
  requestAnimationFrame(tick);
}

function grantPrize(p) {
  const w = walletOf(db.session.user);
  if (p.loai === "xu") { w.xu += p.value; toast("Trúng " + p.title + "!"); }
  else if (p.loai === "miss") toast("Chúc bạn may mắn lần sau!");
  else {
    const code = "CN" + Date.now().toString().slice(-6);
    w.vouchers.push({ code, title: p.title, loai: p.loai, value: p.value, min: p.loai === "percent" ? 150000 : 0 });
    toast("Trúng " + p.title + " · mã " + code);
  }
}

function checkIn() {
  const w = walletOf(db.session.user);
  const today = new Date().toDateString();
  if (w.lastCheckin === today) return toast("Hôm nay đã điểm danh rồi.");
  w.lastCheckin = today;
  w.spins += 1;
  persist();
  toast("Điểm danh thành công. +1 lượt quay.");
  render();
}

function exchangeXu(id) {
  const offer = XU_CATALOG.find(o => o.id === id);
  if (!offer) return;
  const w = walletOf(db.session.user);
  if (w.xu < offer.xu) return toast("Chưa đủ Xu. Cần " + offer.xu.toLocaleString("en-US") + " Xu.");
  w.xu -= offer.xu;
  const code = "XU" + Date.now().toString().slice(-6);
  w.vouchers.push({ code, title: offer.title, loai: offer.loai, value: offer.value, min: offer.min });
  persist();
  toast("Đã đổi " + offer.title + " · mã " + code);
  render();
}

function buySpin() {
  const w = walletOf(db.session.user);
  if (w.xu < 100) return toast("Cần 100 Xu để đổi 1 lượt.");
  w.xu -= 100;
  w.spins += 1;
  persist();
  toast("Đã đổi 1 lượt quay.");
  render();
}

function openAi(prompt) {
  if (!db.session) { requireLogin("Đăng nhập để dùng trợ lý AI.", "ai"); return; }
  view = "ai";
  render();
  if (prompt) setTimeout(() => askAi(prompt), 50);
}

function fold(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

function askAi(text) {
  const msg = (text || $("ai-in")?.value || "").trim();
  if (!msg) return;
  db.chat.push({ role: "me", text: msg });
  db.chat.push({ role: "bot", text: thinkAi(msg) });
  persist();
  if ($("ai-in")) $("ai-in").value = "";
  render();
}

function thinkAi(raw) {
  const f = fold(raw);
  const people = Number((raw.match(/(\d+)\s*người/i) || [])[1] || 0);
  const budget = Number((raw.replace(/\./g, "").match(/(\d{4,7})\s*đ/) || [])[1] || 0);
  let pool = db.products.filter(p => p.active);
  if (/hai san|ca |tom |muc/.test(f)) pool = pool.filter(p => p.cat === "Hải sản");
  else if (/thit|bo |ga |suon|ba chi/.test(f)) pool = pool.filter(p => p.cat === "Thịt");
  else if (/rau|cu |an chay|eat/.test(f)) pool = pool.filter(p => p.cat === "Rau củ" || p.cat === "Trái cây");
  else if (/sang|xoi|banh mi|chao/.test(f)) pool = pool.filter(p => ["Gạo & mì", "Chế biến", "Đồ uống"].includes(p.cat));

  const n = people || 4;
  const cap = budget || 200000;
  const picks = [];
  let sum = 0;
  const prefer = ["Thịt ba chỉ", "Rau muống", "Cà chua Đà Lạt", "Gạo ST25", "Cà rốt", "Tôm sú", "Ức gà"];
  for (const name of prefer) {
    const p = pool.find(x => x.name === name) || db.products.find(x => x.name === name);
    if (p && sum + p.price <= cap) { picks.push(p); sum += p.price; }
  }
  for (const p of pool) {
    if (picks.length >= 5) break;
    if (picks.includes(p)) continue;
    if (sum + p.price <= cap) { picks.push(p); sum += p.price; }
  }
  const region = /bac|ha noi/.test(f) ? "chuẩn vị Bắc (canh chua, luộc, kho vừa miệng)" : "cân bằng dinh dưỡng";
  const recHtml = picks.map(p => `• ${p.name} — ${vnd(p.price)}/${p.unit}`).join("\n");
  return `Chào ${db.session.name}! Mình là trợ lý Smart Food AI.\n\nGợi ý mâm cơm ${n} người, ngân sách ~${vnd(cap)}, ${region}.\n\n${recHtml}\n\nTạm tính ${vnd(sum)} · còn dư ${vnd(Math.max(0, cap - sum))}.\nBấm nút bên phải để thêm từng món vào giỏ, hoặc nói mình biết khẩu vị (ít dầu / hải sản / eat-clean).`;
}

function renderAi() {
  const recs = db.products.filter(p => p.active).slice(0, 6);
  return `<div class="wrap page ai-box">
    <div class="chat">
      <div class="chat-log" id="chat-log">
        ${(db.chat.length ? db.chat : [{ role: "bot", text: "Chào bạn! Hãy cho AI biết gia đình có mấy người, ngân sách và món muốn ăn hôm nay." }]).map(m => `<div class="bubble ${m.role}">${esc(m.text)}</div>`).join("")}
      </div>
      <form class="chat-form" onsubmit="event.preventDefault();askAi()">
        <input id="ai-in" placeholder="Ví dụ: 4 người, 200.000đ, vị Bắc">
        <button class="btn">Gửi</button>
      </form>
    </div>
    <aside class="card">
      <h3>Gợi ý nhanh</h3>
      <button class="btn ghost block" style="margin:6px 0" onclick="openAi('Mâm cơm gia đình 4 người, ngân sách 200.000đ, vị Bắc')">Mâm cơm 4 người</button>
      <button class="btn ghost block" style="margin:6px 0" onclick="openAi('Bữa sáng eat-clean 2 người 80.000đ')">Bữa sáng eat-clean</button>
      <button class="btn ghost block" style="margin:6px 0" onclick="openAi('Hải sản tươi cho 3 người 300.000đ')">Hải sản tươi</button>
      <h3 style="margin-top:16px">Thêm vào giỏ</h3>
      ${recs.map(p => `<div class="meal-row">${pic(p.img, p.name)}<div style="flex:1"><b>${esc(p.name)}</b><div class="price">${vnd(p.price)}</div></div><button class="btn sm" onclick="addCart(${p.id})">+</button></div>`).join("")}
    </aside>
  </div>`;
}

function adminShell(inner) {
  const items = [...NAV_ADMIN, ...(isAdminOnly() ? NAV_ADMIN_EXTRA : []), ["logout", "Đăng xuất"]];
  return `<div class="admin">
    <aside class="sidebar">
      <div class="side-brand">${LOGO_SVG}<span>Chợ Nhà<br>Admin</span></div>
      ${items.map(([k, t]) => `<button class="${adminView === k ? "on" : ""}" onclick="${k === "logout" ? "logout()" : "adminView='" + k + "';render()"}">${t}</button>`).join("")}
    </aside>
    <div class="admin-main">
      <div class="admin-top">Xin chào, ${esc(db.session.name)}</div>
      <div class="admin-body">${inner}</div>
    </div>
  </div>`;
}

function monthBars() {
  const months = Array(6).fill(0);
  const now = new Date();
  db.orders.forEach(o => {
    const d = new Date(o.when.split(",")[0].split("/").reverse().join("-") || Date.now());
    const diff = (now.getMonth() + 12 - d.getMonth()) % 12;
    if (diff < 6 && o.status !== "Đã hủy") months[5 - diff] += o.total;
  });
  const max = Math.max(1, ...months);
  const labels = [...Array(6)].map((_, i) => {
    const m = new Date(); m.setMonth(m.getMonth() - (5 - i));
    return "T" + (m.getMonth() + 1);
  });
  return `<div class="card"><h3>Doanh thu 6 tháng</h3><div class="bars">${months.map((v, i) => `<div class="bar" style="height:${Math.round(v / max * 150)}px"><span>${labels[i]}</span></div>`).join("")}</div></div>`;
}

function renderDashboard() {
  const live = db.orders.filter(o => o.status !== "Đã hủy");
  const rev = live.reduce((s, o) => s + o.total, 0);
  const qty = live.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  return `
    <h2>Tổng quan</h2>
    <div class="kpis">
      <div class="kpi">Doanh thu<b>${vnd(rev)}</b></div>
      <div class="kpi">Số đơn<b>${db.orders.length}</b></div>
      <div class="kpi">SP đã bán<b>${qty}</b></div>
      <div class="kpi">Khách hàng<b>${db.users.filter(u => u.role === "CUSTOMER").length}</b></div>
    </div>
    ${monthBars()}
    <div class="table-wrap" style="margin-top:16px">
      <table><tr><th>Mã</th><th>Khách</th><th>Trạng thái</th><th>Tổng</th></tr>
      ${db.orders.slice(0, 8).map(o => `<tr><td>${o.ma}</td><td>${esc(o.name)}</td><td>${esc(o.status)}</td><td>${vnd(o.total)}</td></tr>`).join("") || "<tr><td colspan='4'>Chưa có đơn</td></tr>"}
      </table>
    </div>`;
}

function renderAdminProducts() {
  return `<div style="display:flex;justify-content:space-between;align-items:center"><h2>Sản phẩm</h2><button class="btn" onclick="editProduct()">Thêm SP</button></div>
    <div class="table-wrap"><table>
      <tr><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Kho</th><th>TT</th><th></th></tr>
      ${db.products.map(p => `<tr>
        <td>${esc(p.name)}</td><td>${esc(p.cat)}</td><td>${vnd(p.price)}</td><td>${p.stock}</td>
        <td>${p.active ? "Hiện" : "Ẩn"}</td>
        <td><button class="btn ghost sm" onclick="editProduct(${p.id})">Sửa</button>
            <button class="btn ghost sm" onclick="toggleProduct(${p.id})">${p.active ? "Ẩn" : "Hiện"}</button>
            <button class="btn danger sm" onclick="deleteProduct(${p.id})">Xóa</button></td>
      </tr>`).join("")}
    </table></div>`;
}

function editProduct(id) {
  const p = product(id) || { name: "", cat: "Rau củ", price: 0, unit: "kg", stock: 0, desc: "", origin: "", emoji: "🥗", active: true };
  const name = prompt("Tên sản phẩm", p.name); if (name == null) return;
  const price = Number(prompt("Giá", p.price)); if (!price) return toast("Giá không hợp lệ.");
  const stock = Number(prompt("Tồn kho", p.stock ?? 0));
  if (id) { p.name = name; p.price = price; p.stock = stock; }
  else {
    const np = { id: Date.now(), name, cat: p.cat, price, unit: "kg", stock, desc: name, origin: "Chợ Nhà", emoji: "🥗", active: true };
    np.img = productArt(np);
    db.products.push(np);
  }
  persist();
  render();
}

function deleteProduct(id) {
  const p = product(id);
  if (!p) return;
  if (!confirm("Xóa sản phẩm '" + p.name + "'? Thao tác không hoàn tác.")) return;
  db.products = db.products.filter(x => x.id !== id);
  db.cart = db.cart.filter(x => x.id !== id);
  persist();
  toast("Đã xóa " + p.name);
  render();
}

function toggleProduct(id) {
  const p = product(id);
  if (!confirm((p.active ? "Ẩn" : "Hiện") + " sản phẩm '" + p.name + "'?")) return;
  p.active = !p.active;
  persist();
  render();
}

function renderAdminCategories() {
  return `<div style="display:flex;justify-content:space-between"><h2>Danh mục</h2><button class="btn" onclick="addCat()">Thêm</button></div>
    <div class="table-wrap"><table><tr><th>Tên</th><th>Mô tả</th><th>TT</th></tr>
    ${db.categories.map(c => `<tr><td>${c.ico} ${esc(c.name)}</td><td>${esc(c.desc)}</td>
      <td><button class="btn ghost sm" onclick="toggleCat(${c.id})">${c.active ? "Ẩn" : "Hiện"}</button></td></tr>`).join("")}
    </table></div>`;
}

function toggleCat(id) {
  const c = db.categories.find(x => x.id === id);
  if (!c) return;
  c.active = !c.active;
  persist();
  render();
}

function addCat() {
  const name = prompt("Tên danh mục");
  if (!name) return;
  db.categories.push({ id: Date.now(), name, ico: "🛒", desc: "", active: true });
  persist();
  render();
}

function renderAdminOrders() {
  return `<h2>Đơn hàng</h2>
    <div class="table-wrap"><table>
      <tr><th>Mã</th><th>Khách</th><th>SĐT</th><th>Tổng</th><th>Trạng thái</th><th></th></tr>
      ${db.orders.map(o => `<tr>
        <td>${o.ma}</td><td>${esc(o.name)}</td><td>${esc(o.phone)}</td><td>${vnd(o.total)}</td>
        <td>${esc(o.status)}</td>
        <td>
          <select onchange="setOrderStatus('${o.ma}', this.value)">
            ${["Chờ xác nhận", "Đang giao", "Hoàn thành", "Đã hủy"].map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </td>
      </tr>`).join("") || "<tr><td colspan='6'>Chưa có đơn</td></tr>"}
    </table></div>`;
}

function setOrderStatus(ma, st) {
  const o = db.orders.find(x => x.ma === ma);
  if (o) { o.status = st; persist(); toast("Đã cập nhật " + ma); render(); }
}

function renderAdminCustomers() {
  const cs = db.users.filter(u => u.role === "CUSTOMER");
  return `<h2>Khách hàng</h2>
    <div class="table-wrap"><table><tr><th>Tên</th><th>Tài khoản</th><th>SĐT</th><th>Đơn</th></tr>
    ${cs.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.user)}</td><td>${esc(u.phone || "")}</td>
      <td>${db.orders.filter(o => o.user === u.user).length}</td></tr>`).join("")}
    </table></div>`;
}

function renderAdminReviews() {
  return `<h2>Đánh giá</h2>
    <div class="table-wrap"><table><tr><th>SP</th><th>Khách</th><th>Sao</th><th>Nội dung</th></tr>
    ${db.reviews.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.user)}</td><td>${r.stars}</td><td>${esc(r.text)}</td></tr>`).join("") || "<tr><td colspan='4'>Chưa có đánh giá</td></tr>"}
    </table></div>`;
}

function renderAdminVouchers() {
  const list = prizes();
  const sum = list.reduce((s, p) => s + Math.max(0, p.weight), 0) || 1;
  return `<h2>Voucher chiến dịch</h2>
    <div class="table-wrap"><table><tr><th>Mã</th><th>Tên</th><th>Giá trị</th><th>Đơn tối thiểu</th></tr>
    ${CAMPAIGNS.map(c => `<tr><td><b>${c.code}</b></td><td>${esc(c.title)}</td><td>${c.loai === "ship" ? "Freeship" : vnd(c.value)}</td><td>${vnd(c.min)}</td></tr>`).join("")}
    </table></div>
    <div class="card" style="margin-top:16px">
      <h3>Cấu hình lượt quay (8 ô) — kéo thanh hoặc nhập % rồi Lưu tỷ lệ</h3>
      <div class="pie-host"><canvas id="admin-pie" width="140" height="140"></canvas></div>
      <div class="wheel-edit">
        ${list.map((p, i) => {
          const pct = (Math.max(0, p.weight) * 100 / sum);
          return `<div class="wrow">
            <span class="wdot" style="background:${p.color}"></span>
            <span class="wtitle">${i} ${esc(p.title)}</span>
            <input class="wbar" id="wbar-${i}" type="range" min="0" max="100" value="${p.weight}" oninput="setWheelWeight(${i}, this.value)">
            <input class="wnum" id="wnum-${i}" type="number" min="0" max="100" value="${p.weight}" oninput="setWheelWeight(${i}, this.value)">
            <b class="wpct" id="wpct-${i}">${pct.toFixed(1)}</b>
          </div>`;
        }).join("")}
      </div>
      <p id="wsum" class="${sum === 100 ? "ok" : ""}" style="color:${sum === 100 ? "var(--ok)" : "var(--accent)"}">Tổng nhập: ${sum}% — xác suất thực tế theo tỷ lệ tương đối.</p>
      <div class="hero-actions">
        <button class="btn ghost lg" onclick="wheelDefault()">Mặc định</button>
        <button class="btn ghost lg" onclick="wheelNormalize()">Chuẩn hóa 100%</button>
        <button class="btn lg" onclick="wheelSave()">Lưu tỷ lệ</button>
      </div>
    </div>`;
}

function setWheelWeight(i, val) {
  prizes()[i].weight = Math.max(0, Number(val) || 0);
  const bar = $("wbar-" + i), num = $("wnum-" + i);
  if (bar) bar.value = prizes()[i].weight;
  if (num) num.value = prizes()[i].weight;
  refreshWheelEditor();
}

function refreshWheelEditor() {
  const list = prizes();
  const sum = list.reduce((s, p) => s + Math.max(0, p.weight), 0) || 1;
  list.forEach((p, i) => {
    const el = $("wpct-" + i);
    if (el) el.textContent = (Math.max(0, p.weight) * 100 / sum).toFixed(1);
  });
  const s = $("wsum");
  if (s) {
    s.textContent = "Tổng nhập: " + list.reduce((a, p) => a + Math.max(0, p.weight), 0) + "% — xác suất thực tế theo tỷ lệ tương đối.";
    s.style.color = list.reduce((a, p) => a + Math.max(0, p.weight), 0) === 100 ? "var(--ok)" : "var(--accent)";
  }
  drawAdminPie();
}

function wheelDefault() {
  db.wheel = WHEEL_DEFAULT.map(p => ({ ...p }));
  persist();
  toast("Đã khôi phục tỉ lệ mặc định.");
  render();
}

function wheelNormalize() {
  const list = prizes();
  const sum = list.reduce((s, p) => s + Math.max(0, p.weight), 0);
  if (sum <= 0) return;
  let leftover = 100;
  for (let i = 0; i < list.length - 1; i++) {
    const w = Math.round(list[i].weight * 100 / sum);
    list[i].weight = w;
    leftover -= w;
  }
  list[list.length - 1].weight = Math.max(0, leftover);
  persist();
  toast("Đã chuẩn hóa tổng 100%.");
  render();
}

function wheelSave() {
  persist();
  toast("Đã lưu tỷ lệ vòng quay.");
  refreshWheelEditor();
}

function drawAdminPie() {
  const c = $("admin-pie");
  if (!c) return;
  const ctx = c.getContext("2d");
  const list = prizes();
  const sum = list.reduce((s, p) => s + Math.max(0, p.weight), 0) || 1;
  ctx.clearRect(0, 0, 140, 140);
  let a = -Math.PI / 2;
  list.forEach(p => {
    const slice = (Math.max(0, p.weight) / sum) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(70, 70);
    ctx.arc(70, 70, 58, a, a + slice);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    a += slice;
  });
  ctx.beginPath();
  ctx.arc(70, 70, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#0b5c32";
  ctx.font = "bold 13px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("100%", 70, 70);
}

function renderAdminAi() {
  return `<h2>Quản lý AI</h2>
    <div class="kpis">
      <div class="kpi">Hội thoại<b>${db.chat.filter(m => m.role === "me").length}</b></div>
      <div class="kpi">Provider<b>Mock</b></div>
    </div>
    <div class="card"><p>Trợ lý Smart Food AI đang chạy chế độ Mock (giống app Visual Studio khi AI:Provider = Mock). Gợi ý combo từ kho hàng thật theo ngân sách, số người và khẩu vị.</p></div>`;
}

function renderReports() {
  const live = db.orders.filter(o => o.status !== "Đã hủy");
  const byCat = {};
  live.forEach(o => o.items.forEach(i => {
    const p = product(i.id);
    const c = p?.cat || "Khác";
    byCat[c] = (byCat[c] || 0) + i.price * i.qty;
  }));
  return `<h2>Báo cáo</h2>
    <div class="kpis">
      <div class="kpi">Doanh thu<b>${vnd(live.reduce((s, o) => s + o.total, 0))}</b></div>
      <div class="kpi">Đơn hoàn thành<b>${db.orders.filter(o => o.status === "Hoàn thành").length}</b></div>
    </div>
    ${monthBars()}
    <div class="table-wrap" style="margin-top:16px"><table><tr><th>Danh mục</th><th>Doanh thu</th></tr>
      ${Object.entries(byCat).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${vnd(v)}</td></tr>`).join("") || "<tr><td colspan='2'>Chưa có dữ liệu</td></tr>"}
    </table></div>`;
}

function doSearch(e) {
  e.preventDefault();
  keyword = $("q").value.trim();
  view = "products";
  render();
}

function render() {
  const root = $("app");
  if (view === "login" || view === "register") {
    root.innerHTML = renderAuth();
    return;
  }
  if (!db.session && !GUEST_VIEWS.has(view)) {
    view = "login";
    root.innerHTML = renderAuth();
    return;
  }
  if (isAdmin()) {
    view = "admin";
    let inner = "";
    if (adminView === "products") inner = renderAdminProducts();
    else if (adminView === "orders") inner = renderAdminOrders();
    else if (adminView === "customers") inner = renderAdminCustomers();
    else if (adminView === "reviews") inner = renderAdminReviews();
    else if (adminView === "vouchers") inner = renderAdminVouchers();
    else if (adminView === "categories") inner = renderAdminCategories();
    else if (adminView === "ai") inner = renderAdminAi();
    else if (adminView === "reports") inner = renderReports();
    else inner = renderDashboard();
    root.innerHTML = adminShell(inner);
    if (adminView === "vouchers") requestAnimationFrame(drawAdminPie);
    return;
  }
  let inner = "";
  if (view === "products") inner = renderProducts();
  else if (view === "detail") inner = renderDetail();
  else if (view === "cart") inner = renderCart();
  else if (view === "checkout") inner = renderCheckout();
  else if (view === "orders") inner = renderOrders();
  else if (view === "account") inner = renderAccount();
  else if (view === "reviews") inner = renderReviews();
  else if (view === "voucher") inner = renderVoucher();
  else if (view === "ai") inner = renderAi();
  else inner = renderHome();
  root.innerHTML = customerShell(inner);
  if (view === "voucher") requestAnimationFrame(drawWheel);
  if (view === "ai") {
    const log = $("chat-log");
    if (log) log.scrollTop = log.scrollHeight;
  }
}

window.addEventListener("load", render);
