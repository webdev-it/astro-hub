// Минимальная логика клиента для демонстрационного магазина
const products = [
  { id: 1, title: 'Наушники X100', price: 3990, desc: 'Беспроводные наушники с шумоподавлением', img: '' },
  { id: 2, title: 'Чехол для телефона', price: 599, desc: 'Прочный силиконовый чехол', img: '' },
  { id: 3, title: 'Портативная колонка', price: 2490, desc: 'Bluetooth колонка с глубоким басом', img: '' },
  { id: 4, title: 'Умная лампа', price: 1290, desc: 'RGB лампа с управлением через приложение', img: '' },
  { id: 5, title: 'Умная лампasfasа', price: 1290, desc: 'Rsdfsdfsd', img: '' }
];

const state = { cart: {} };

function formatPrice(v){
  return v.toFixed(2).replace('.', ',');
}

function renderProducts(list){
  const el = document.getElementById('products');
  el.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const thumb = document.createElement('div');
    thumb.className = 'product-thumb';
    const img = document.createElement('img');
    img.alt = p.title;
    img.src = p.img || 'https://via.placeholder.com/300x180?text=' + encodeURIComponent(p.title);
    thumb.appendChild(img);

    const title = document.createElement('h3');
    title.className = 'product-title';
    title.textContent = p.title;

    const desc = document.createElement('div');
    desc.className = 'product-desc';
    desc.textContent = p.desc;

    const meta = document.createElement('div');
    meta.className = 'product-meta';
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = formatPrice(p.price) + ' ₽';

    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Добавить в корзину';
    btn.onclick = () => addToCart(p.id);

    meta.appendChild(price);
    meta.appendChild(btn);

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);

    el.appendChild(card);
  })
}

function addToCart(id){
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveState();
  renderCart();
}

function removeFromCart(id){
  delete state.cart[id];
  saveState();
  renderCart();
}

function changeQty(id, delta){
  state.cart[id] = Math.max(0, (state.cart[id] || 0) + delta);
  if(state.cart[id] === 0) delete state.cart[id];
  saveState();
  renderCart();
}

function cartCount(){
  return Object.values(state.cart).reduce((s,n)=>s+n,0);
}

function cartTotal(){
  return Object.entries(state.cart).reduce((sum,[id,qty]) => {
    const p = products.find(x=>x.id==id);
    return sum + (p ? p.price * qty : 0);
  },0);
}

function renderCart(){
  const panel = document.getElementById('cartPanel');
  const items = document.getElementById('cartItems');
  const count = document.getElementById('cartCount');
  const total = document.getElementById('cartTotal');

  count.textContent = cartCount();
  total.textContent = formatPrice(cartTotal());

  items.innerHTML = '';
  if(cartCount()===0){
    items.innerHTML = '<div class="muted">Корзина пуста</div>';
    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden','true');
    return;
  }

  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden','false');

  for(const [id,qty] of Object.entries(state.cart)){
    const p = products.find(x => x.id == id);
    if(!p) continue;
    const it = document.createElement('div');
    it.className = 'cart-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const h = document.createElement('h4');
    h.textContent = p.title;
    const small = document.createElement('div');
    small.className = 'small';
    small.textContent = formatPrice(p.price) + ' ₽ × ' + qty;

    meta.appendChild(h);
    meta.appendChild(small);

    const controls = document.createElement('div');
    controls.className = 'qty-controls';
    const minus = document.createElement('button');
    minus.className = 'btn-ghost';
    minus.textContent = '-';
    minus.onclick = ()=>changeQty(id,-1);
    const plus = document.createElement('button');
    plus.className = 'btn';
    plus.textContent = '+';
    plus.onclick = ()=>changeQty(id,1);
    const del = document.createElement('button');
    del.className = 'btn-ghost';
    del.textContent = '✕';
    del.onclick = ()=>removeFromCart(id);

    controls.appendChild(minus);
    controls.appendChild(plus);
    controls.appendChild(del);

    it.appendChild(meta);
    it.appendChild(controls);

    items.appendChild(it);
  }
}

function saveState(){
  try{localStorage.setItem('demo_shop_cart', JSON.stringify(state.cart));}catch(e){}
}
function loadState(){
  try{const s = JSON.parse(localStorage.getItem('demo_shop_cart')||'{}');state.cart = s;}catch(e){state.cart={}};
}

function clearCart(){state.cart={};saveState();renderCart();}

function checkout(){
  if(cartCount()===0){alert('Корзина пуста');return}
  // демонстрационная имитация оформления
  alert('Спасибо! Ваш заказ оформлен (демо). Сумма: ' + formatPrice(cartTotal()) + ' ₽');
  clearCart();
}

function init(){
  document.getElementById('year').textContent = new Date().getFullYear();
  renderProducts(products);
  loadState();
  renderCart();

  document.getElementById('clearCart').onclick = clearCart;
  document.getElementById('checkout').onclick = checkout;
  document.getElementById('cartBtn').onclick = ()=>{
    const panel = document.getElementById('cartPanel');
    panel.classList.toggle('hidden');
  }

  document.getElementById('searchInput').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    if(!q) return renderProducts(products);
    renderProducts(products.filter(p=> (p.title+p.desc).toLowerCase().includes(q)));
  })
}

window.addEventListener('DOMContentLoaded', init);
