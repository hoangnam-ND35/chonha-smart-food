const LOGO_SVG = `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#006e2f"/>
  <path d="M6 18 L16 9 L26 18 V26 H6 Z" fill="#fff"/>
  <rect x="13" y="20" width="6" height="6" rx="1" fill="#22c55e"/>
  <circle cx="22" cy="11" r="4" fill="#6bff8f"/>
</svg>`;

const CATS_META = [
  { id: 1, name: "Hải sản", ico: "🦐", desc: "Tươi đánh trong ngày" },
  { id: 2, name: "Thịt", ico: "🥩", desc: "Mổ sáng, bảo ôn" },
  { id: 3, name: "Rau củ", ico: "🥬", desc: "VietGAP & GlobalGAP" },
  { id: 4, name: "Trái cây", ico: "🥭", desc: "Theo mùa, ngọt tự nhiên" },
  { id: 5, name: "Gạo & mì", ico: "🍚", desc: "Bữa sáng no lâu" },
  { id: 6, name: "Chế biến", ico: "🍜", desc: "Nóng hổi, tiện lợi" },
  { id: 7, name: "Đồ uống", ico: "☕", desc: "Sữa, trà, cà phê" }
];

const PRODUCTS_SEED = [
  { id: 1, name: "Cá hồi tươi", cat: "Hải sản", price: 329000, unit: "kg", stock: 40, desc: "Cá hồi tươi, giàu omega-3, giao lạnh 2H.", origin: "Na Uy / Nafoods", emoji: "🐟", file: "cahoi.jpg" },
  { id: 2, name: "Cá basa fillet", cat: "Hải sản", price: 89000, unit: "kg", stock: 55, desc: "Fillet basa không xương, thịt ngọt.", origin: "Đồng Tháp", emoji: "🐟", file: "cabasa.jpg" },
  { id: 3, name: "Tôm sú", cat: "Hải sản", price: 259000, unit: "kg", stock: 32, desc: "Tôm sú size lớn, bắt trong ngày.", origin: "Cà Mau", emoji: "🦐", file: "tomsu.jpg" },
  { id: 4, name: "Mực ống", cat: "Hải sản", price: 179000, unit: "kg", stock: 28, desc: "Mực ống tươi, giòn ngọt.", origin: "Nha Trang", emoji: "🦑", file: "mucong.jpg" },
  { id: 5, name: "Nghêu", cat: "Hải sản", price: 45000, unit: "kg", stock: 60, desc: "Nghêu sạch, hấp sả ớt.", origin: "Tiền Giang", emoji: "🐚", file: "ngheu.jpg" },
  { id: 6, name: "Thịt ba chỉ", cat: "Thịt", price: 149000, unit: "kg", stock: 48, desc: "Ba chỉ heo, mỡ-nạc cân.", origin: "Trang trại Ba Vì", emoji: "🥓", file: "thitbachi.jpg" },
  { id: 7, name: "Sườn non", cat: "Thịt", price: 169000, unit: "kg", stock: 36, desc: "Sườn non heo, om chua ngọt.", origin: "Trang trại Ba Vì", emoji: "🍖", file: "suonnon.jpg" },
  { id: 8, name: "Thịt bò Úc", cat: "Thịt", price: 289000, unit: "kg", stock: 24, desc: "Bò Úc mềm, áp chảo hoặc phở.", origin: "Úc", emoji: "🥩", file: "thitbouc.jpg" },
  { id: 9, name: "Gà ta", cat: "Thịt", price: 119000, unit: "con", stock: 30, desc: "Gà ta thả vườn.", origin: "Đông Anh", emoji: "🍗", file: "gata.jpg" },
  { id: 10, name: "Ức gà", cat: "Thịt", price: 79000, unit: "kg", stock: 42, desc: "Ức gà ít mỡ, eat-clean.", origin: "CP Foods", emoji: "🍗", file: "ucga.jpg" },
  { id: 11, name: "Rau muống", cat: "Rau củ", price: 15000, unit: "bó", stock: 80, desc: "Rau muống VietGAP.", origin: "Hưng Yên", emoji: "🥬", file: "raumuong.jpg" },
  { id: 12, name: "Bắp cải", cat: "Rau củ", price: 18000, unit: "kg", stock: 70, desc: "Bắp cải Đà Lạt.", origin: "Đà Lạt", emoji: "🥬", file: "bapcai.jpg" },
  { id: 13, name: "Cà rốt", cat: "Rau củ", price: 22000, unit: "kg", stock: 65, desc: "Cà rốt ngọt, nước ép.", origin: "Đà Lạt", emoji: "🥕", file: "carot.jpg" },
  { id: 14, name: "Cà chua Đà Lạt", cat: "Rau củ", price: 28000, unit: "kg", stock: 58, desc: "Cà chua bi/trái lớn Đà Lạt.", origin: "Đà Lạt", emoji: "🍅", file: "cachuadalat.jpg" },
  { id: 15, name: "Khoai tây", cat: "Rau củ", price: 25000, unit: "kg", stock: 74, desc: "Khoai tây chiên, hầm.", origin: "Đà Lạt", emoji: "🥔", file: "khoaitay.jpg" },
  { id: 16, name: "Xoài cát", cat: "Trái cây", price: 45000, unit: "kg", stock: 40, desc: "Xoài cát Hòa Lộc.", origin: "Tiền Giang", emoji: "🥭", file: "xoaicat.jpg" },
  { id: 17, name: "Chuối sứ", cat: "Trái cây", price: 22000, unit: "kg", stock: 50, desc: "Chuối sứ chín cây.", origin: "Long An", emoji: "🍌", file: "chuoisu.jpg" },
  { id: 18, name: "Dưa hấu", cat: "Trái cây", price: 18000, unit: "kg", stock: 35, desc: "Dưa hấu ruột đỏ.", origin: "Long An", emoji: "🍉", file: "duahau.jpg" },
  { id: 19, name: "Nho xanh", cat: "Trái cây", price: 89000, unit: "kg", stock: 22, desc: "Nho xanh không hạt.", origin: "Ninh Thuận", emoji: "🍇", file: "nhoxanh.jpg" },
  { id: 20, name: "Cam sành", cat: "Trái cây", price: 35000, unit: "kg", stock: 44, desc: "Cam sành mọng nước.", origin: "Hàm Yên", emoji: "🍊", file: "camsanh.jpg" },
  { id: 21, name: "Gạo ST25", cat: "Gạo & mì", price: 45000, unit: "kg", stock: 90, desc: "Gạo ST25 thơm hạt dài.", origin: "Sóc Trăng", emoji: "🍚", file: "gaost25.jpg" },
  { id: 22, name: "Gạo Jasmine", cat: "Gạo & mì", price: 28000, unit: "kg", stock: 85, desc: "Gạo Jasmine mềm cơm.", origin: "An Giang", emoji: "🍚", file: "gaojasmine.jpg" },
  { id: 23, name: "Mì Hảo Hảo", cat: "Gạo & mì", price: 4500, unit: "gói", stock: 200, desc: "Mì tôm chua cay.", origin: "Acecook", emoji: "🍜", file: "mihaohao.jpg" },
  { id: 24, name: "Đậu xanh", cat: "Gạo & mì", price: 32000, unit: "kg", stock: 40, desc: "Đậu xanh cà vỏ.", origin: "Tây Ninh", emoji: "🫘", file: "dauxanh.jpg" },
  { id: 25, name: "Xôi đậu xanh", cat: "Gạo & mì", price: 25000, unit: "phần", stock: 25, desc: "Xôi đậu xanh ăn sáng.", origin: "Bếp Chợ Nhà", emoji: "🍙", file: "xoidauxanh.jpg" },
  { id: 26, name: "Bánh mì", cat: "Gạo & mì", price: 12000, unit: "ổ", stock: 40, desc: "Bánh mì vỏ giòn.", origin: "Lò Chợ Nhà", emoji: "🥖", file: "banhmi.jpg" },
  { id: 27, name: "Chả lụa", cat: "Chế biến", price: 95000, unit: "kg", stock: 20, desc: "Chả lụa truyền thống.", origin: "Đức Huệ", emoji: "🍥", file: "chalua.jpg" },
  { id: 28, name: "Giò thủ", cat: "Chế biến", price: 110000, unit: "kg", stock: 16, desc: "Giò thủ dai giòn.", origin: "Hà Nội", emoji: "🍖", file: "giothu.jpg" },
  { id: 29, name: "Xúc xích", cat: "Chế biến", price: 65000, unit: "hộp", stock: 30, desc: "Xúc xích tiệt trùng.", origin: "Vissan", emoji: "🌭", file: "xucxich.jpg" },
  { id: 30, name: "Cháo gà", cat: "Chế biến", price: 35000, unit: "phần", stock: 18, desc: "Cháo gà nóng hổi.", origin: "Bếp Chợ Nhà", emoji: "🥣", file: "chaoga.jpg" },
  { id: 31, name: "Sữa Vinamilk", cat: "Đồ uống", price: 32000, unit: "lốc", stock: 50, desc: "Sữa tươi tiệt trùng.", origin: "Vinamilk", emoji: "🥛", file: "suatoivinamilk.jpg" },
  { id: 32, name: "Nước cam", cat: "Đồ uống", price: 18000, unit: "chai", stock: 40, desc: "Nước cam ép.", origin: "Chợ Nhà Juice", emoji: "🧃", file: "camep.jpg" },
  { id: 33, name: "Cà phê rang xay", cat: "Đồ uống", price: 89000, unit: "gói", stock: 28, desc: "Cà phê rang mộc.", origin: "Buôn Ma Thuột", emoji: "☕", file: "caferangxay.jpg" },
  { id: 34, name: "Trà xanh", cat: "Đồ uống", price: 45000, unit: "gói", stock: 33, desc: "Trà xanh Thái Nguyên.", origin: "Thái Nguyên", emoji: "🍵", file: "traxanhkhongdo.jpg" },
  { id: 35, name: "Nước mắm", cat: "Đồ uống", price: 38000, unit: "chai", stock: 45, desc: "Nước mắm nhĩ.", origin: "Phú Quốc", emoji: "🧴", file: "nuocmam.jpg" }
];

const LANDING_REVIEWS = [
  { name: "Ngọc Huyền (Ba Đình, Hà Nội)", stars: "★★★★★  Đã mua 18 lần", text: "Rau muống, thịt ba chỉ vẫn tươi như vừa hái. Nhà mình 4 người ăn no mà vẫn tiết kiệm so với đi chợ chiều.", tag: "Yêu thích · Thịt heo · Rau xanh" },
  { name: "Thanh Loan (Cầu Giấy, HN)", stars: "★★★★★  Thành viên 1 năm", text: "Giao siêu nhanh, đóng gói sạch sẽ. Trợ lý AI gợi ý mâm cơm đúng khẩu vị Bắc, ông xã khen suốt.", tag: "Combo gia đình · AI gợi ý" },
  { name: "Minh Châu (Thanh Xuân, HN)", stars: "★★★★★  Đã mua 26 lần", text: "Cá hồi, tôm sú tươi, không tanh. Có lần ship trễ 20 phút họ hoàn voucher ngay, rất có tâm.", tag: "Hải sản · Đổi trả nhanh" },
  { name: "Anh Đức (Long Biên, HN)", stars: "★★★★★  Thành viên mới", text: "Lần đầu dùng quà tân thủ, freeship 2H. Khoai tây, cà rốt Đà Lạt ngọt, nấu canh cả nhà khen.", tag: "Nông sản Đà Lạt · Tân thủ" }
];

const WHEEL_PRIZES = [
  { title: "200 Xu", loai: "xu", value: 200, weight: 8, color: "#22c55e" },
  { title: "Voucher 15k", loai: "amount", value: 15000, weight: 5, color: "#006e2f" },
  { title: "Freeship 2H", loai: "ship", value: 0, weight: 4, color: "#0ea5e9" },
  { title: "Voucher 50k", loai: "amount", value: 50000, weight: 2, color: "#ef9900" },
  { title: "500 Xu", loai: "xu", value: 500, weight: 4, color: "#16a34a" },
  { title: "Giảm 10%", loai: "percent", value: 10, weight: 3, color: "#855300" },
  { title: "Voucher 20k", loai: "amount", value: 20000, weight: 5, color: "#1f6c3a" },
  { title: "Chúc may mắn", loai: "miss", value: 0, weight: 69, color: "#bccbb9" }
];

const CAMPAIGNS = [
  { code: "CHONHA", title: "Giảm 25.000đ Chợ Nhà", loai: "amount", value: 25000, min: 100000 },
  { code: "CHONHAMOI", title: "Giảm 15.000đ khách mới", loai: "amount", value: 15000, min: 100000 },
  { code: "CHONHA50K", title: "Giảm 50.000đ đơn đầu", loai: "amount", value: 50000, min: 150000 },
  { code: "FREESHIP2H", title: "Freeship hỏa tốc 2 giờ", loai: "ship", value: 0, min: 0 }
];

const XU_CATALOG = [
  { id: "xu10", xu: 3400, title: "Voucher giảm 10.000đ", loai: "amount", value: 10000, min: 0, days: 30 },
  { id: "xu25", xu: 8500, title: "Voucher giảm 25.000đ", loai: "amount", value: 25000, min: 100000, days: 30 },
  { id: "xufs", xu: 13600, title: "Freeship hỏa tốc 2 giờ", loai: "ship", value: 0, min: 0, days: 15 },
  { id: "xu50", xu: 20400, title: "Voucher giảm 50.000đ", loai: "amount", value: 50000, min: 250000, days: 30 },
  { id: "xu10p", xu: 34000, title: "Voucher giảm 10% đơn", loai: "percent", value: 10, min: 150000, days: 20 }
];

const WHEEL_DEFAULT = WHEEL_PRIZES.map(p => ({ ...p }));

const CAT_COLORS = {
  "Hải sản": ["#0ea5e9", "#0369a1"],
  "Thịt": ["#ef4444", "#991b1b"],
  "Rau củ": ["#22c55e", "#166534"],
  "Trái cây": ["#f59e0b", "#b45309"],
  "Gạo & mì": ["#eab308", "#a16207"],
  "Chế biến": ["#f97316", "#9a3412"],
  "Đồ uống": ["#8b5cf6", "#5b21b6"]
};

function productArt(p) {
  const [a, b] = CAT_COLORS[p.cat] || ["#22c55e", "#006e2f"];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${a}'/><stop offset='100%' stop-color='${b}'/>
    </linearGradient></defs>
    <rect width='400' height='300' fill='url(#g)'/>
    <circle cx='320' cy='40' r='70' fill='rgba(255,255,255,.16)'/>
    <circle cx='40' cy='260' r='80' fill='rgba(255,255,255,.12)'/>
    <text x='200' y='155' text-anchor='middle' font-size='84'>${p.emoji || "🥗"}</text>
    <text x='200' y='250' text-anchor='middle' fill='white' font-family='Segoe UI' font-size='22' font-weight='700'>${p.name}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

PRODUCTS_SEED.forEach(p => {
  p.img = p.file ? "imgs/" + p.file : productArt(p);
  p.active = true;
});
