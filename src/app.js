const MODELS = [
  { id: 'fable', name: 'Claude Fable 5.2', desc: 'Творческое письмо и тонкие рассуждения', logo: 'CF', color: 'linear-gradient(135deg,#d97757,#b45309)', tag: 'Флагман' },
  { id: 'opus', name: 'Claude Opus 5.5', desc: 'Самая сильная модель для кода и агентов', logo: 'CO', color: 'linear-gradient(135deg,#f0a35e,#c2410c)', tag: 'Код' },
  { id: 'gpt', name: 'GPT 6.1 Sol', desc: 'Очень быстрый, с огромным контекстом', logo: 'S', color: 'linear-gradient(135deg,#10a37f,#047857)', tag: 'Скорость' },
  { id: 'grok', name: 'Grok 4.7', desc: 'Дерзкий разум от xAI с поиском в реальном времени', logo: 'G', color: 'linear-gradient(135deg,#3f3f46,#18181b)', tag: 'Реалтайм' },
  { id: 'zork', name: 'Zork Core', desc: 'Наша собственная модель — сбалансированная и лёгкая', logo: 'Z', color: 'linear-gradient(135deg,#c7c7d8,#5c5c70)', tag: 'Своя' },
  { id: 'astra', name: 'GPT 6 Astra', desc: 'Максимальные возможности для сложных задач', logo: 'A', color: 'linear-gradient(135deg,#7c6cf5,#4c1d95)', tag: 'Мощь' },
];

const SUGGESTIONS = [
  '✍️ Напиши рассказ о роботе, который научился мечтать',
  '🧠 Объясни квантовую запутанность простыми словами',
  '💻 Напиши игру «Змейка» на JavaScript',
  '🎨 Придумай концепт логотипа для кофейни',
];

const $ = (s, r = document) => r.querySelector(s);

/* ---------- модели: карточки, аватары, меню ---------- */
const modelsGrid = $('#modelsGrid');
modelsGrid.innerHTML = MODELS.map((m, i) => `
  <article class="mcard reveal" style="--d:${i * 0.07}s">
    <span class="mcard__tag">${m.tag}</span>
    <div class="mcard__logo" style="background:${m.color}">${m.logo}</div>
    <h3>${m.name}</h3>
    <p>${m.desc}</p>
  </article>`).join('');

$('#heroAvatars').innerHTML = MODELS.map(m => `
  <div class="mavatar" style="background:${m.color}" title="${m.name}">${m.logo}</div>`).join('');

const modelList = $('[data-model-list]');
modelList.innerHTML = MODELS.map(m => `
  <button data-model="${m.id}">
    <span class="mm-logo" style="background:${m.color}">${m.logo}</span>
    <span><span class="mm-name">${m.name}</span><br /><span class="mm-desc">${m.desc}</span></span>
    <span class="mm-check">✓</span>
  </button>`).join('');

function setModel(id) {
  const m = MODELS.find(x => x.id === id) || MODELS[0];
  $('[data-model-name]').textContent = m.name;
  $('[data-model-dot]').style.background = m.color.includes('#') ? m.color : '#b7b3ff';
  modelList.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.model === m.id));
  modelList.hidden = true;
}
setModel('fable');

$('[data-model-menu]').addEventListener('click', (e) => {
  e.stopPropagation();
  modelList.hidden = !modelList.hidden;
});
document.addEventListener('click', () => { modelList.hidden = true; });
modelList.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-model]');
  if (b) setModel(b.dataset.model);
});

/* ---------- открытие/закрытие чата ---------- */
const landing = $('#landing');
const chat = $('#chat');
function openChat() {
  landing.style.display = 'none';
  chat.hidden = false;
  requestAnimationFrame(() => chat.classList.add('open'));
  document.body.style.overflow = 'hidden';
  try { history.replaceState(null, '', '#chat'); } catch {}
  $('[data-input]').focus();
}
function closeChat() {
  chat.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { chat.hidden = true; landing.style.display = ''; }, 350);
  try { history.replaceState(null, '', '/'); } catch {}
}
document.querySelectorAll('[data-open-chat]').forEach(b => b.addEventListener('click', openChat));
$('[data-close-chat]').addEventListener('click', closeChat);
if (location.hash === '#chat') openChat();

/* ---------- сайдбар на мобиле ---------- */
const sidebar = $('.chat__sidebar');
$('[data-burger]').addEventListener('click', () => sidebar.classList.toggle('open'));
chat.addEventListener('click', (e) => { if (e.target.closest('.chat__main') && sidebar.classList.contains('open')) sidebar.classList.remove('open'); });

/* ---------- история чатов ---------- */
const history = $('[data-history]');
const chats = [{ id: 1, title: 'Новый чат' }];
let currentChat = 1;

function renderHistory() {
  history.innerHTML = chats.map(c => `
    <button class="${c.id === currentChat ? 'active' : ''}" data-chat="${c.id}">${c.title}</button>`).join('');
}
renderHistory();
history.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-chat]');
  if (!b) return;
  currentChat = +b.dataset.chat;
  renderHistory();
  sidebar.classList.remove('open');
});

/* ---------- подсказки ---------- */
$('[data-suggestions]').innerHTML = SUGGESTIONS.map(s => `<button>${s}</button>`).join('');
$('[data-suggestions]').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) send(b.textContent.replace(/^\W+\s*/, ''));
});

/* ---------- отправка и имитация ответа ---------- */
const messages = $('[data-messages]');
const scroll = $('[data-scroll]');
const input = $('[data-input]');
const welcome = $('.chat__welcome');

function scrollDown() { scroll.scrollTop = scroll.scrollHeight; }

function addMsg(role, text) {
  const model = MODELS.find(m => $('[data-model-name]').textContent === m.name) || MODELS[0];
  const el = document.createElement('div');
  el.className = `msg msg--${role}`;
  el.innerHTML = `
    <div class="msg__avatar" style="background:${role === 'ai' ? model.color : 'rgba(255,255,255,0.14)'}">${role === 'ai' ? model.logo : 'Я'}</div>
    <div class="msg__bubble"></div>`;
  el.querySelector('.msg__bubble').textContent = text;
  messages.appendChild(el);
  scrollDown();
  return el;
}

const THINKING_PHRASES = ['Размышляю…', 'Анализирую вопрос…', 'Копаю глубже…', 'Собираю мысль…', 'Формулирую ответ…'];

function showThinking() {
  const el = document.createElement('div');
  el.className = 'msg msg--ai';
  el.innerHTML = `
    <div class="msg__avatar" style="background:${MODELS[0].color}">${MODELS[0].logo}</div>
    <div class="msg__bubble">
      <span class="thinking">
        <span class="thinking__orbit"></span>
        <span class="thinking__label">${THINKING_PHRASES[0]}</span>
        <span class="thinking__dots"><i></i><i></i><i></i></span>
      </span>
    </div>`;
  messages.appendChild(el);
  scrollDown();
  const label = el.querySelector('.thinking__label');
  let i = 0;
  const t = setInterval(() => { label.textContent = THINKING_PHRASES[++i % THINKING_PHRASES.length]; }, 1300);
  return { done: () => { clearInterval(t); el.remove(); } };
}

const REPLIES = [
  'Отличный вопрос! Вот что я думаю:\n\n1. Начнём с главного — суть в деталях.\n2. Каждая сложная задача распадается на простые шаги.\n3. А магия — это просто хорошо подобранные слова.\n\nХотите, разберу подробнее?',
  'Интересная мысль! Если взглянуть под другим углом, здесь есть несколько слоёв. Расскажите чуть больше о контексте — и я предложу три разных подхода.',
  'Готово! Я набросал решение и отметил ключевые места. Скажите, если нужно глубже — разложу по шагам с примерами кода.',
];

function send(text) {
  if (!text.trim()) return;
  welcome.style.display = 'none';
  addMsg('user', text);
  input.value = '';
  input.style.height = 'auto';
  if (chats[0].title === 'Новый чат') { chats[0].title = text.slice(0, 30) + (text.length > 30 ? '…' : ''); renderHistory(); }
  const th = showThinking();
  setTimeout(() => {
    th.done();
    addMsg('ai', REPLIES[Math.floor(Math.random() * REPLIES.length)]);
  }, 1800 + Math.random() * 1600);
}

$('[data-form]').addEventListener('submit', (e) => {
  e.preventDefault();
  send(input.value);
});
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 180) + 'px';
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
});

$('[data-new-chat]').addEventListener('click', () => {
  messages.innerHTML = '';
  welcome.style.display = '';
  sidebar.classList.remove('open');
});

/* ---------- reveal-анимации и курсор на карточках ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

document.addEventListener('mousemove', (e) => {
  const card = e.target.closest?.('.mcard');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  card.style.setProperty('--my', (e.clientY - r.top) + 'px');
});

addEventListener('scroll', () => $('.nav').classList.toggle('scrolled', scrollY > 20), { passive: true });
