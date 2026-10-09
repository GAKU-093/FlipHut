(function () {
'use strict';

var C = window.FLIPHUT_CONFIG || {};
var BUCKET = 'fliphut';

var SMILE = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18"/><path d="M17 19v4M31 19v4M15 29c5 6 13 6 18 0"/></svg>';
var TYPES = {
  comic: { label: 'Quadrinho', plural: 'Quadrinhos', hint: 'Suba as páginas e pronto.',
    icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10h32a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H25l-9 8v-8H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z"/><path d="M14 19h20M14 25h12"/></svg>' },
  movie: { label: 'Filme', plural: 'Filmes', hint: 'Cole o link do seu vídeo.',
    icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="10" width="36" height="28" rx="3"/><path d="M16 10v28M32 10v28M6 19h10M6 29h10M32 19h10M32 29h10"/></svg>' },
  series: { label: 'Série', plural: 'Séries', hint: 'Monte os episódios.',
    icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="14" width="30" height="22" rx="3"/><path d="M14 9h20M18 41h12M21 21l8 4-8 4z"/></svg>' },
  book: { label: 'Livro', plural: 'Livros', hint: 'Escreva ou cole os capítulos.',
    icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 12c-4-3-11-4-17-3v26c6-1 13 0 17 3 4-3 11-4 17-3V9c-6-1-13 0-17 3z"/><path d="M24 12v26"/></svg>' }
};
var ORDER = ['comic', 'movie', 'series', 'book'];

var S = {
  view: 'home', filter: 'all',
  works: [], worksState: 'wait',
  session: null, name: '',
  work: null, detailState: '', sub: '', chapter: 0,
  comicPages: [], chapters: [], episodes: [],
  draft: null, fs: 1, busy: false, confirmDel: false, nav: 0
};
var A = { mode: 'signin', note: '', msg: '', cls: '', busy: false, phone: '' };

var app = document.getElementById('app');
var sb = null;

/* ---------- utilidades ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function safeUrl(u) { u = String(u || '').trim(); return /^https?:\/\/[^\s]+$/i.test(u) ? u : ''; }
function pad(n, w) { return String(n).padStart(w, '0'); }
function isId(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || '')); }
function toTop() { try { window.scrollTo(0, 0); } catch (e) {} }
function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function uid() { return S.session && S.session.user ? S.session.user.id : null; }
function pubUrl(path) { return path ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : ''; }
function $(id) { return document.getElementById(id); }
function setHTML(id, html) { var el = $(id); if (el) el.innerHTML = html; }
function setText(id, txt, cls) { var el = $(id); if (!el) return; el.textContent = txt || ''; el.className = 'msg' + (cls ? ' ' + cls : ''); }
var toastTimer = null;
function toast(msg) {
  var el = $('toast'); if (!el) return;
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.hidden = true; }, 3500);
}

/* ---------- topo e rodapé ---------- */
function headerHTML() {
  var acct = S.session
    ? '<span class="who">' + esc(S.name || 'Conectado') + '</span><button type="button" class="btn ghost sm" data-act="logout">Sair</button>'
    : '<button type="button" class="btn ghost" data-act="login">Entrar</button>';
  return '<header class="top"><a class="brand" href="#/" aria-label="FliPHut, início"><img class="logo" src="logo.png" alt="FliPHut"></a>' +
    '<nav class="nav">' + acct + '<button type="button" class="btn ghost" data-act="explore">Explorar</button><a class="btn" href="#/criar">Criar</a></nav></header>';
}
function renderHeader() { setHTML('hdr', headerHTML()); }
function footerHTML() {
  return '<footer class="foot">' + SMILE + '<span>FliPHut. Grátis pra ler e grátis pra assistir.</span></footer>';
}

/* ---------- início ---------- */
function homeHTML() {
  var picks = ORDER.map(function (k) {
    var t = TYPES[k];
    return '<button type="button" class="pick" data-act="pick" data-type="' + k + '"><span class="pick-ic">' + t.icon + '</span><span class="pick-t">' + t.label + '</span><span class="pick-h">' + t.hint + '</span></button>';
  }).join('');
  return '<section class="hero"><h1>O que você vai <em>criar</em> hoje?</h1><p class="lead">Escolha, faça e publique. Qualquer pessoa pode ler e assistir de graça, sem cadastro.</p></section>' +
    '<section class="picks" id="picks" aria-label="Escolha o formato">' + picks + '</section>' +
    '<section id="explore"><div class="shelf-head"><h2>Pra ler e assistir agora</h2><div class="tabs" id="tabs"></div></div><div id="shelf"></div></section>';
}
function cardHTML(w) {
  var t = TYPES[w.type] || TYPES.comic, cv = pubUrl(w.cover_path);
  return '<li><a class="card" href="#/obra/' + esc(w.id) + '"><span class="cover">' +
    (cv ? '<img src="' + esc(cv) + '" alt="" loading="lazy">' : '<span class="ph">' + esc(String(w.title || '?').trim().charAt(0).toUpperCase()) + '</span>') +
    '<span class="badge">' + t.label + '</span></span><span class="c-title">' + esc(w.title) + '</span><span class="c-by">' + esc(w.author_name) + '</span></a></li>';
}
function renderShelf() {
  var shelf = $('shelf'), tabs = $('tabs'); if (!shelf || !tabs) return;
  var counts = { all: S.works.length };
  ORDER.forEach(function (k) { counts[k] = S.works.filter(function (w) { return w.type === k; }).length; });
  var tb = [['all', 'Tudo']].concat(ORDER.map(function (k) { return [k, TYPES[k].plural]; }));
  tabs.innerHTML = tb.map(function (p) {
    return '<button type="button" class="tab" data-act="filter" data-f="' + p[0] + '" aria-pressed="' + (S.filter === p[0]) + '">' + p[1] + (S.worksState === 'ok' ? ' ' + counts[p[0]] : '') + '</button>';
  }).join('');
  if (S.worksState === 'wait') { shelf.innerHTML = '<p class="muted">Carregando as obras…</p>'; return; }
  if (S.worksState === 'error') { shelf.innerHTML = '<div class="empty">' + SMILE + '<strong>Não deu pra carregar</strong><span class="muted">Confira sua internet e recarregue a página.</span></div>'; return; }
  var list = S.filter === 'all' ? S.works : S.works.filter(function (w) { return w.type === S.filter; });
  if (!list.length) {
    shelf.innerHTML = '<div class="empty">' + SMILE + '<strong>' + (S.works.length ? 'Nada neste formato ainda' : 'Ainda não tem obra publicada') + '</strong><span class="muted">A primeira pode ser a sua. Escolha um formato lá em cima.</span></div>';
    return;
  }
  shelf.innerHTML = '<ul class="grid">' + list.map(cardHTML).join('') + '</ul>';
}
async function loadWorks() {
  S.worksState = 'wait'; if (S.view === 'home') renderShelf();
  var r = await sb.from('works').select('id,type,title,author_name,cover_path,owner_id,created_at').order('created_at', { ascending: false }).limit(200);
  if (r.error) { S.worksState = 'error'; S.works = []; }
  else { S.worksState = 'ok'; S.works = r.data || []; }
  if (S.view === 'home') renderShelf();
}

/* ---------- obra ---------- */
function backBar(href, label) {
  return '<div class="rbar"><a class="btn ghost sm" href="' + href + '">' + label + '</a></div>';
}
function workHTML() {
  if (S.detailState === 'wait') return backBar('#/', '← Voltar') + '<p class="muted">Carregando a obra…</p>';
  if (S.detailState === 'missing' || !S.work) return backBar('#/', '← Voltar') + '<div class="empty">' + SMILE + '<strong>Obra não encontrada</strong><span class="muted">O link pode estar errado, ou a obra foi apagada.</span></div>';
  if (S.detailState === 'error') return backBar('#/', '← Voltar') + '<div class="empty">' + SMILE + '<strong>Não deu pra carregar</strong><span class="muted">Confira sua internet e recarregue a página.</span></div>';
  var w = S.work, t = TYPES[w.type] || TYPES.comic, cv = pubUrl(w.cover_path), body = '';
  if (w.type === 'comic') {
    body = S.comicPages.length
      ? '<a class="btn big" href="#/obra/' + esc(w.id) + '/ler">Ler agora · ' + S.comicPages.length + ' páginas</a>'
      : '<p class="muted">Este quadrinho ainda não tem páginas.</p>';
  } else if (w.type === 'book') {
    body = '<h2 class="tag">Capítulos</h2><ol class="list">' + S.chapters.map(function (c, i) {
      return '<li><a class="item" href="#/obra/' + esc(w.id) + '/cap/' + (i + 1) + '"><span class="n">' + (i + 1) + '</span><span class="t">' + esc(c.title || ('Capítulo ' + (i + 1))) + '</span><span class="tag">Ler</span></a></li>';
    }).join('') + '</ol>';
  } else if (w.type === 'movie') {
    var u = safeUrl(w.video_url);
    body = u ? '<a class="btn big" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Assistir</a><p class="muted small">O vídeo abre em outra aba.</p>' : '<p class="muted">Esta obra ficou sem link de vídeo.</p>';
  } else {
    body = '<h2 class="tag">Episódios</h2><ol class="list">' + S.episodes.map(function (ep, i) {
      var u2 = safeUrl(ep.url);
      return '<li class="item"><span class="n">' + (i + 1) + '</span><span class="t">' + esc(ep.title) + '</span>' + (u2 ? '<a class="btn sm" href="' + esc(u2) + '" target="_blank" rel="noopener noreferrer">Assistir</a>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  var mine = uid() && w.owner_id === uid(), danger = '';
  if (mine) {
    danger = S.confirmDel
      ? '<div class="dangerzone"><span>Apagar de vez?</span><button type="button" class="btn danger sm" data-act="doDelete"' + (S.busy ? ' disabled' : '') + '>Sim, apagar</button><button type="button" class="btn ghost sm" data-act="cancelDelete">Cancelar</button></div>'
      : '<div class="dangerzone"><button type="button" class="btn danger sm" data-act="askDelete">Apagar minha obra</button></div>';
  }
  return backBar('#/', '← Voltar') +
    '<article class="work"><span class="cover">' + (cv ? '<img src="' + esc(cv) + '" alt="Capa de ' + esc(w.title) + '">' : '<span class="ph">' + esc(String(w.title || '?').trim().charAt(0).toUpperCase()) + '</span>') + '</span>' +
    '<div><span class="tag">' + t.label + '</span><h1>' + esc(w.title) + '</h1><p class="by">por ' + esc(w.author_name) + '</p>' +
    (w.synopsis ? '<p class="syn">' + esc(w.synopsis) + '</p>' : '') + body +
    '<div class="dangerzone"><button type="button" class="btn ghost sm" data-act="copy">Copiar link</button></div>' + danger +
    '<p id="workMsg" class="msg err" role="alert"></p></div></article>';
}

/* ---------- leitor ---------- */
function readComicHTML() {
  var w = S.work, back = '#/obra/' + esc(w.id);
  var inner = S.comicPages.length
    ? '<div class="strip">' + S.comicPages.map(function (p, i) { return '<img src="' + esc(pubUrl(p.image_path)) + '" alt="Página ' + (i + 1) + '" loading="lazy" decoding="async">'; }).join('') + '</div>'
    : '<p class="muted">Este quadrinho ainda não tem páginas.</p>';
  return '<div class="rbar"><a class="btn ghost sm" href="' + back + '">← Voltar</a><span class="rtitle">' + esc(w.title) + '</span></div>' + inner +
    '<div class="rend"><a class="btn" href="' + back + '">Fim. Voltar para a obra</a></div>';
}
function readBookHTML() {
  var w = S.work, back = '#/obra/' + esc(w.id), c = S.chapters[S.chapter];
  if (!c) return backBar(back, '← Voltar') + '<div class="empty">' + SMILE + '<strong>Capítulo não encontrado</strong></div>';
  var paras = String(c.body || '').split(/\n{2,}/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  var hasPrev = S.chapter > 0, hasNext = S.chapter < S.chapters.length - 1;
  return '<div class="rbar"><a class="btn ghost sm" href="' + back + '">← Capítulos</a><span class="rtitle">' + esc(w.title) + '</span>' +
    '<span class="fsbox"><button type="button" class="mini" data-act="fs" data-d="-0.1" aria-label="Diminuir letra">A−</button><button type="button" class="mini" data-act="fs" data-d="0.1" aria-label="Aumentar letra">A+</button></span></div>' +
    '<article class="book" id="book"><h2>' + esc(c.title || ('Capítulo ' + (S.chapter + 1))) + '</h2>' + paras + '</article>' +
    '<div class="rend">' +
    (hasPrev ? '<a class="btn ghost" href="' + back + '/cap/' + S.chapter + '">← Anterior</a>' : '<span class="btn ghost" aria-disabled="true">← Anterior</span>') +
    (hasNext ? '<a class="btn" href="' + back + '/cap/' + (S.chapter + 2) + '">Próximo →</a>' : '<span class="btn" aria-disabled="true">Próximo →</span>') +
    '</div>';
}
async function showWork(id, sub, n) {
  var tok = ++S.nav;
  S.sub = sub || ''; S.chapter = Math.max(0, (parseInt(n, 10) || 1) - 1);
  S.view = 'work';
  if (!S.work || S.work.id !== id || S.detailState !== 'ok') {
    S.work = null; S.detailState = 'wait'; S.confirmDel = false; render(); toTop();
    var r = await sb.from('works').select('*').eq('id', id).maybeSingle();
    if (tok !== S.nav) return;
    if (r.error || !r.data) { S.detailState = r.error ? 'error' : 'missing'; render(); return; }
    var w = r.data, q = null;
    S.comicPages = []; S.chapters = []; S.episodes = [];
    if (w.type === 'comic') q = sb.from('comic_pages').select('position,image_path').eq('work_id', id).order('position');
    else if (w.type === 'book') q = sb.from('chapters').select('position,title,body').eq('work_id', id).order('position');
    else if (w.type === 'series') q = sb.from('episodes').select('position,title,url').eq('work_id', id).order('position');
    if (q) {
      var r2 = await q;
      if (tok !== S.nav) return;
      if (r2.error) { S.detailState = 'error'; render(); return; }
      if (w.type === 'comic') S.comicPages = r2.data || [];
      else if (w.type === 'book') S.chapters = r2.data || [];
      else S.episodes = r2.data || [];
    }
    S.work = w; S.detailState = 'ok';
  }
  render(); toTop();
}
async function deleteWork() {
  var w = S.work; if (!w || S.busy) return;
  S.busy = true; render();
  try {
    var paths = [];
    if (w.cover_path) paths.push(w.cover_path);
    S.comicPages.forEach(function (p) { if (p.image_path) paths.push(p.image_path); });
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    var r = await sb.from('works').delete().eq('id', w.id);
    if (r.error) throw r.error;
    S.busy = false; S.confirmDel = false; S.work = null; S.detailState = '';
    S.works = S.works.filter(function (x) { return x.id !== w.id; });
    toast('Obra apagada.');
    location.hash = '#/';
  } catch (e) {
    S.busy = false; S.confirmDel = false; render();
    setText('workMsg', 'Não deu para apagar agora. Tente de novo em instantes.', 'err');
  }
}

/* ---------- criar ---------- */
function newDraft(type) {
  return { type: type, title: '', author: lsGet('fliphut.author') || S.name || '', synopsis: '', cover: null, pages: [],
    chapters: [{ title: 'Capítulo 1', text: '' }], videoUrl: '', episodes: [{ title: 'Episódio 1', url: '' }] };
}
function pagesHTML() {
  var d = S.draft;
  if (!d.pages.length) return '<p class="muted small">Nenhuma página ainda.</p>';
  return '<ol class="thumbs">' + d.pages.map(function (p, i) {
    return '<li><img src="' + p.url + '" alt="Página ' + (i + 1) + '"><span class="pn">' + (i + 1) + '</span><span class="tb">' +
      '<button type="button" class="mini" data-act="pgLeft" data-i="' + i + '" aria-label="Mover para antes">←</button>' +
      '<button type="button" class="mini" data-act="pgRight" data-i="' + i + '" aria-label="Mover para depois">→</button>' +
      '<button type="button" class="mini" data-act="pgDel" data-i="' + i + '" aria-label="Tirar página">✕</button></span></li>';
  }).join('') + '</ol>';
}
function chaptersHTML() {
  var d = S.draft;
  return d.chapters.map(function (c, i) {
    return '<div class="block"><div class="blockhead"><strong>Capítulo ' + (i + 1) + '</strong>' + (d.chapters.length > 1 ? '<button type="button" class="mini" data-act="chDel" data-i="' + i + '" aria-label="Tirar capítulo">✕</button>' : '') + '</div>' +
      '<input type="text" id="ch-t-' + i + '" data-ch="' + i + '" data-k="title" maxlength="80" placeholder="Título do capítulo" aria-label="Título do capítulo ' + (i + 1) + '" value="' + esc(c.title) + '">' +
      '<textarea class="long" id="ch-x-' + i + '" data-ch="' + i + '" data-k="text" placeholder="Escreva ou cole o texto aqui. Deixe uma linha em branco entre parágrafos." aria-label="Texto do capítulo ' + (i + 1) + '">' + esc(c.text) + '</textarea></div>';
  }).join('');
}
function episodesHTML() {
  var d = S.draft;
  return d.episodes.map(function (c, i) {
    return '<div class="block"><div class="blockhead"><strong>Episódio ' + (i + 1) + '</strong>' + (d.episodes.length > 1 ? '<button type="button" class="mini" data-act="epDel" data-i="' + i + '" aria-label="Tirar episódio">✕</button>' : '') + '</div>' +
      '<input type="text" id="ep-t-' + i + '" data-ep="' + i + '" data-k="title" maxlength="80" placeholder="Título do episódio" aria-label="Título do episódio ' + (i + 1) + '" value="' + esc(c.title) + '">' +
      '<input type="url" id="ep-u-' + i + '" data-ep="' + i + '" data-k="url" placeholder="https://link-do-episodio" aria-label="Link do episódio ' + (i + 1) + '" value="' + esc(c.url) + '"></div>';
  }).join('');
}
function createHTML() {
  var d = S.draft, t = TYPES[d.type];
  var tabs = ORDER.map(function (k) { return '<button type="button" class="tab" data-act="pickType" data-type="' + k + '" aria-pressed="' + (d.type === k) + '">' + TYPES[k].label + '</button>'; }).join('');
  var specific = '';
  if (d.type === 'comic') {
    specific = '<div class="field"><span class="lbl">Páginas</span><p class="hint">Escolha as imagens na ordem. Dá pra mudar a ordem depois. Elas são reduzidas pra carregar rápido.</p>' +
      '<div class="file"><input type="file" id="pageFiles" accept="image/*" multiple aria-label="Escolher páginas"></div><p id="pageMsg" class="msg"></p><div id="pagesList">' + pagesHTML() + '</div></div>';
  } else if (d.type === 'book') {
    specific = '<div class="field"><span class="lbl">Capítulos</span><div id="chList" class="form">' + chaptersHTML() + '</div><div><button type="button" class="btn ghost sm" data-act="chAdd">+ Capítulo</button></div></div>';
  } else if (d.type === 'movie') {
    specific = '<div class="field"><label for="f-video">Link do vídeo</label><p class="hint">Cole o endereço de onde o filme está (YouTube, Vimeo, Drive). Quem clicar assiste lá, de graça.</p>' +
      '<input type="url" id="f-video" data-f="videoUrl" placeholder="https://" value="' + esc(d.videoUrl) + '"></div>';
  } else {
    specific = '<div class="field"><span class="lbl">Episódios</span><div id="epList" class="form">' + episodesHTML() + '</div><div><button type="button" class="btn ghost sm" data-act="epAdd">+ Episódio</button></div></div>';
  }
  var notice = S.session ? '' : '<div class="notice">Você pode montar a obra agora. Para publicar, <button type="button" class="linkbtn" data-act="login">entre ou crie uma conta</button>.</div>';
  return notice + '<section class="create">' + backBar('#/', '← Voltar') +
    '<div class="typetabs" role="group" aria-label="Formato">' + tabs + '</div><h1>Novo ' + t.label + '</h1>' +
    '<form class="form" id="form" autocomplete="off" novalidate>' +
    '<div class="field"><label for="f-title">Título</label><input type="text" id="f-title" data-f="title" maxlength="80" value="' + esc(d.title) + '"></div>' +
    '<div class="field"><label for="f-author">Seu nome</label><input type="text" id="f-author" data-f="author" maxlength="40" value="' + esc(d.author) + '"></div>' +
    '<div class="field"><label for="f-syn">Sinopse</label><textarea id="f-syn" data-f="synopsis" maxlength="1200" placeholder="Do que se trata, em poucas linhas.">' + esc(d.synopsis) + '</textarea></div>' +
    '<div class="field"><span class="lbl">Capa</span><div class="file"><input type="file" id="coverFile" accept="image/*" aria-label="Escolher capa"><span id="cprev" class="cprev">' + (d.cover ? '<img src="' + d.cover.url + '" alt="Prévia da capa">' : '') + '</span></div><p id="coverMsg" class="msg"></p></div>' +
    specific + '<p id="formMsg" class="msg" role="alert"></p>' +
    '<div><button type="submit" class="btn big" id="pubBtn">Publicar</button></div></form></section>';
}

/* imagens */
function loadImg(file) {
  return new Promise(function (res, rej) {
    var u = URL.createObjectURL(file), im = new Image();
    im.onload = function () { URL.revokeObjectURL(u); res(im); };
    im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('img')); };
    im.src = u;
  });
}
function toBlob(cv, q) { return new Promise(function (res) { cv.toBlob(res, 'image/jpeg', q); }); }
async function compress(file, maxW, maxBytes) {
  var im = await loadImg(file), w = im.naturalWidth, h = im.naturalHeight;
  if (!w || !h) throw new Error('img');
  var scale = Math.min(1, maxW / w), q = 0.85;
  for (var i = 0; i < 8; i++) {
    var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch); cx.drawImage(im, 0, 0, cw, ch);
    var blob = await toBlob(cv, q);
    if (blob && blob.size <= maxBytes) return { blob: blob, url: URL.createObjectURL(blob) };
    q -= 0.08; if (q < 0.5) { q = 0.75; scale *= 0.8; }
  }
  throw new Error('big');
}
async function onCover(input) {
  var f = input.files && input.files[0]; if (!f) return;
  setText('coverMsg', 'Preparando a capa…');
  try {
    if (S.draft.cover) URL.revokeObjectURL(S.draft.cover.url);
    S.draft.cover = await compress(f, 600, 400000);
    setHTML('cprev', '<img src="' + S.draft.cover.url + '" alt="Prévia da capa">');
    setText('coverMsg', '');
  } catch (e) { setText('coverMsg', 'Não consegui usar essa imagem. Tente outro arquivo.', 'err'); }
}
async function onPages(input) {
  var files = Array.prototype.slice.call(input.files || []); if (!files.length) return;
  var room = 120 - S.draft.pages.length, limited = false;
  if (files.length > room) { files = files.slice(0, Math.max(room, 0)); limited = true; }
  var done = 0, bad = 0;
  for (var i = 0; i < files.length; i++) {
    setText('pageMsg', 'Preparando página ' + (i + 1) + ' de ' + files.length + '…');
    try { S.draft.pages.push(await compress(files[i], 1400, 1500000)); done++; } catch (e) { bad++; }
  }
  input.value = '';
  setHTML('pagesList', pagesHTML());
  if (limited) setText('pageMsg', 'Limite de 120 páginas por quadrinho.', 'err');
  else setText('pageMsg', bad ? (bad + ' arquivo(s) não puderam ser usados.') : (done ? done + ' página(s) adicionada(s).' : ''), bad ? 'err' : 'ok');
}

/* publicar */
function errMsg(e) {
  var m = String(e && e.message || '').toLowerCase();
  if (m.indexOf('row-level security') >= 0 || m.indexOf('jwt') >= 0 || m.indexOf('not authenticated') >= 0) return 'Seu login expirou. Entre de novo e publique outra vez.';
  if (m.indexOf('too large') >= 0 || m.indexOf('exceeded') >= 0) return 'Uma das imagens ficou grande demais. Tente imagens menores.';
  if (m.indexOf('failed to fetch') >= 0 || m.indexOf('network') >= 0) return 'Sem conexão. Confira sua internet e tente de novo.';
  return 'Não deu para publicar agora. Tente de novo em instantes.';
}
function validate(d) {
  if (!d.title.trim()) return 'Dê um título para a obra.';
  if (!d.author.trim()) return 'Diga seu nome.';
  if (d.type === 'comic' && !d.pages.length) return 'Adicione pelo menos uma página.';
  if (d.type === 'book') {
    if (!d.chapters.some(function (c) { return c.text.trim(); })) return 'Escreva o texto de pelo menos um capítulo.';
    for (var i = 0; i < d.chapters.length; i++) if (d.chapters[i].text.length > 200000) return 'O capítulo ' + (i + 1) + ' é grande demais. Divida em dois.';
  }
  if (d.type === 'movie' && !safeUrl(d.videoUrl)) return 'Cole um link de vídeo que comece com http:// ou https://.';
  if (d.type === 'series') {
    var eps = d.episodes.filter(function (e) { return e.title.trim() || e.url.trim(); });
    if (!eps.length) return 'Adicione pelo menos um episódio.';
    for (var j = 0; j < eps.length; j++) if (!eps[j].title.trim() || !safeUrl(eps[j].url)) return 'Todo episódio precisa de título e de um link que comece com http:// ou https://.';
  }
  return '';
}
async function upload(path, blob) {
  var r = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (r.error) throw r.error;
}
async function publish() {
  if (S.busy) return;
  var d = S.draft, msg = validate(d);
  if (msg) { setText('formMsg', msg, 'err'); return; }
  if (!S.session) { openAuth('signin', 'Entre para publicar. O que você montou fica aqui nesta página.'); return; }
  S.busy = true;
  var btn = $('pubBtn'); if (btn) btn.disabled = true;
  var owner = uid(), wid = crypto.randomUUID(), base = owner + '/' + wid + '/', uploaded = [];
  try {
    var coverPath = null;
    if (d.cover) { coverPath = base + 'cover.jpg'; setText('formMsg', 'Enviando a capa…'); await upload(coverPath, d.cover.blob); uploaded.push(coverPath); }
    var pageRows = [];
    if (d.type === 'comic') {
      for (var i = 0; i < d.pages.length; i++) {
        setText('formMsg', 'Enviando página ' + (i + 1) + ' de ' + d.pages.length + '…');
        var p = base + 'p' + pad(i + 1, 4) + '.jpg';
        await upload(p, d.pages[i].blob); uploaded.push(p);
        pageRows.push({ work_id: wid, position: i + 1, image_path: p });
      }
    }
    setText('formMsg', 'Publicando…');
    var row = { id: wid, owner_id: owner, type: d.type, title: d.title.trim(), author_name: d.author.trim(), synopsis: d.synopsis.trim(), cover_path: coverPath, video_url: d.type === 'movie' ? safeUrl(d.videoUrl) : null };
    var r1 = await sb.from('works').insert(row); if (r1.error) throw r1.error;
    var r2 = null;
    if (d.type === 'comic') r2 = await sb.from('comic_pages').insert(pageRows);
    else if (d.type === 'book') {
      var chs = d.chapters.filter(function (c) { return c.text.trim(); });
      r2 = await sb.from('chapters').insert(chs.map(function (c, k) { return { work_id: wid, position: k + 1, title: c.title.trim() || ('Capítulo ' + (k + 1)), body: c.text }; }));
    } else if (d.type === 'series') {
      var eps = d.episodes.filter(function (e) { return e.title.trim() || e.url.trim(); });
      r2 = await sb.from('episodes').insert(eps.map(function (e, k) { return { work_id: wid, position: k + 1, title: e.title.trim(), url: safeUrl(e.url) }; }));
    }
    if (r2 && r2.error) throw r2.error;
    lsSet('fliphut.author', row.author_name);
    if (d.cover) URL.revokeObjectURL(d.cover.url);
    d.pages.forEach(function (pg) { URL.revokeObjectURL(pg.url); });
    S.draft = null; S.busy = false; S.work = null; S.detailState = '';
    loadWorks();
    location.hash = '#/obra/' + wid;
  } catch (e) {
    S.busy = false;
    try { await sb.from('works').delete().eq('id', wid); } catch (x) {}
    try { if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded); } catch (x) {}
    var b2 = $('pubBtn'); if (b2) b2.disabled = false;
    setText('formMsg', errMsg(e), 'err');
  }
}

/* ---------- conta ---------- */
function authTitle() { return { signin: 'Entrar', signup: 'Criar conta', forgot: 'Recuperar senha', recovery: 'Nova senha', phone: 'Entrar com celular', code: 'Código do SMS' }[A.mode]; }
function authHTML() {
  var m = A.mode, h = '<button type="button" class="mini closex" data-act="closeAuth" aria-label="Fechar">✕</button><h2>' + authTitle() + '</h2>';
  if (A.note) h += '<p class="muted">' + esc(A.note) + '</p>';
  if ((m === 'signin' || m === 'signup') && C.ENABLE_GOOGLE) h += '<button type="button" class="btn gbtn" data-act="google">Continuar com Google</button><div class="sep"><span>ou</span></div>';
  h += '<form class="form" id="authForm" novalidate>';
  if (m === 'signup') h += '<div class="field"><label for="authName">Seu nome</label><input type="text" id="authName" maxlength="40" autocomplete="name"></div>';
  if (m === 'signin' || m === 'signup' || m === 'forgot') h += '<div class="field"><label for="authEmail">E-mail</label><input type="email" id="authEmail" autocomplete="email" inputmode="email"></div>';
  if (m === 'signin' || m === 'signup' || m === 'recovery') h += '<div class="field"><label for="authPass">' + (m === 'recovery' ? 'Nova senha' : 'Senha') + '</label><input type="password" id="authPass" autocomplete="' + (m === 'signin' ? 'current-password' : 'new-password') + '"></div>';
  if (m === 'phone') h += '<div class="field"><label for="authPhone">Celular com DDD</label><input type="tel" id="authPhone" autocomplete="tel" inputmode="tel" placeholder="+55 11 91234-5678"></div>';
  if (m === 'code') h += '<div class="field"><label for="authCode">Código recebido por SMS</label><input type="text" id="authCode" autocomplete="one-time-code" inputmode="numeric" maxlength="8"></div>';
  var label = { signin: 'Entrar', signup: 'Criar conta', forgot: 'Enviar link', recovery: 'Salvar senha', phone: 'Enviar código', code: 'Confirmar' }[m];
  h += '<p id="authMsg" class="msg" role="alert"></p><button type="submit" class="btn" id="authBtn">' + label + '</button></form><div class="authlinks">';
  if (m === 'signin') {
    h += '<button type="button" class="linkbtn" data-act="authMode" data-m="signup">Criar conta</button><button type="button" class="linkbtn" data-act="authMode" data-m="forgot">Esqueci a senha</button>';
    if (C.ENABLE_PHONE) h += '<button type="button" class="linkbtn" data-act="authMode" data-m="phone">Entrar com celular</button>';
  } else if (m === 'signup' || m === 'forgot' || m === 'phone') {
    h += '<button type="button" class="linkbtn" data-act="authMode" data-m="signin">Já tenho conta</button>';
  }
  return h + '</div>';
}
function openAuth(mode, note) {
  A.mode = mode || 'signin'; A.note = note || ''; A.busy = false;
  var dlg = $('authDlg'); if (!dlg) return;
  dlg.innerHTML = authHTML();
  if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
  var first = dlg.querySelector('input'); if (first) { try { first.focus(); } catch (e) {} }
}
function closeAuth() { var dlg = $('authDlg'); if (dlg && dlg.open) { try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); } } }
function authErr(e) {
  var m = String(e && e.message || '').toLowerCase();
  if (m.indexOf('invalid login') >= 0) return 'E-mail ou senha incorretos.';
  if (m.indexOf('not confirmed') >= 0) return 'Confirme seu e-mail primeiro. Veja a caixa de entrada.';
  if (m.indexOf('already registered') >= 0) return 'Esse e-mail já tem conta. Tente entrar.';
  if (m.indexOf('provider is not enabled') >= 0 || m.indexOf('unsupported provider') >= 0) return 'Esse tipo de login ainda não foi ligado no Supabase.';
  if (m.indexOf('rate limit') >= 0 || m.indexOf('too many') >= 0) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (m.indexOf('password') >= 0 && m.indexOf('least') >= 0) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (m.indexOf('failed to fetch') >= 0 || m.indexOf('network') >= 0) return 'Sem conexão. Confira sua internet.';
  return 'Não deu certo. Confira os dados e tente de novo.';
}
function val(id) { var el = $(id); return el ? el.value.trim() : ''; }
async function doAuth() {
  if (A.busy) return;
  var m = A.mode, back = location.origin + location.pathname;
  var email = val('authEmail'), pass = ($('authPass') || {}).value || '';
  if ((m === 'signin' || m === 'signup' || m === 'forgot') && !/^\S+@\S+\.\S+$/.test(email)) { setText('authMsg', 'Digite um e-mail válido.', 'err'); return; }
  if ((m === 'signin') && !pass) { setText('authMsg', 'Digite sua senha.', 'err'); return; }
  if ((m === 'signup' || m === 'recovery') && pass.length < 8) { setText('authMsg', 'A senha precisa ter pelo menos 8 caracteres.', 'err'); return; }
  A.busy = true; var btn = $('authBtn'); if (btn) btn.disabled = true;
  setText('authMsg', 'Aguarde…');
  try {
    var r;
    if (m === 'signin') {
      r = await sb.auth.signInWithPassword({ email: email, password: pass }); if (r.error) throw r.error;
      closeAuth(); toast('Bem-vindo de volta!');
    } else if (m === 'signup') {
      r = await sb.auth.signUp({ email: email, password: pass, options: { data: { full_name: val('authName') }, emailRedirectTo: back } });
      if (r.error) throw r.error;
      if (r.data.user && r.data.user.identities && r.data.user.identities.length === 0) { setText('authMsg', 'Esse e-mail já tem conta. Tente entrar.', 'err'); }
      else if (!r.data.session) { setText('authMsg', 'Quase lá. Enviamos um link para confirmar seu e-mail.', 'ok'); }
      else { closeAuth(); toast('Conta criada!'); }
    } else if (m === 'forgot') {
      r = await sb.auth.resetPasswordForEmail(email, { redirectTo: back }); if (r.error) throw r.error;
      setText('authMsg', 'Se esse e-mail tem conta, o link chegou na caixa de entrada.', 'ok');
    } else if (m === 'recovery') {
      r = await sb.auth.updateUser({ password: pass }); if (r.error) throw r.error;
      closeAuth(); toast('Senha trocada.');
    } else if (m === 'phone') {
      var ph = val('authPhone').replace(/[^\d+]/g, '');
      if (!/^\+\d{10,15}$/.test(ph)) { setText('authMsg', 'Use o formato +55 11 91234-5678.', 'err'); A.busy = false; if (btn) btn.disabled = false; return; }
      r = await sb.auth.signInWithOtp({ phone: ph }); if (r.error) throw r.error;
      A.phone = ph; openAuth('code', 'Mandamos um código por SMS para ' + ph + '.');
    } else if (m === 'code') {
      r = await sb.auth.verifyOtp({ phone: A.phone, token: val('authCode'), type: 'sms' }); if (r.error) throw r.error;
      closeAuth(); toast('Bem-vindo!');
    }
  } catch (e) {
    setText('authMsg', authErr(e), 'err');
  }
  A.busy = false; var b3 = $('authBtn'); if (b3) b3.disabled = false;
}
async function googleLogin() {
  setText('authMsg', 'Abrindo o Google…');
  var r = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  if (r.error) setText('authMsg', authErr(r.error), 'err');
}
async function afterAuth() {
  var u = S.session && S.session.user, id = u ? u.id : null, changed = id !== S.lastUid;
  S.lastUid = id;
  if (changed) S.name = u ? ((u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || '') : '';
  renderHeader();
  if (!u) { if (changed && S.view === 'work' && S.detailState === 'ok') render(); return; }
  if (changed) {
    var r = await sb.from('profiles').select('display_name').eq('id', u.id).maybeSingle();
    if (r.data && r.data.display_name) { S.name = r.data.display_name; renderHeader(); }
    if (S.draft && !S.draft.author && S.name) { S.draft.author = S.name; var el = $('f-author'); if (el && !el.value) el.value = S.name; }
    if (S.view === 'work' && S.detailState === 'ok') render();
  }
}

/* ---------- navegação ---------- */
function render() {
  var main;
  if (S.view === 'create' && S.draft) main = createHTML();
  else if (S.view === 'work') {
    if (S.detailState === 'ok' && S.work && S.sub === 'ler' && S.work.type === 'comic') main = readComicHTML();
    else if (S.detailState === 'ok' && S.work && S.sub === 'cap' && S.work.type === 'book') main = readBookHTML();
    else main = workHTML();
  } else { S.view = 'home'; main = homeHTML(); }
  renderHeader();
  setHTML('main', main);
  setHTML('ftr', footerHTML());
  if (S.view === 'home') renderShelf();
  if (S.view === 'work' && S.sub === 'cap') { var bk = $('book'); if (bk) bk.style.setProperty('--fs', S.fs); }
}
function route() {
  var p = String(location.hash || '').replace(/^#\/?/, '').split('/');
  S.nav++;
  if (p[0] === 'criar') {
    if (!S.draft) S.draft = newDraft('comic');
    S.view = 'create'; render(); toTop();
  } else if (p[0] === 'obra' && isId(p[1])) {
    showWork(p[1], p[2], p[3]);
  } else {
    var wasHome = S.view === 'home';
    S.view = 'home'; render(); if (!wasHome) toTop();
  }
}
function scrollToId(id) { var el = $(id); if (el) { try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); } } }
function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }

document.addEventListener('click', function (e) {
  var t = e.target.closest && e.target.closest('[data-act]'); if (!t) return;
  var a = t.getAttribute('data-act'), i = parseInt(t.getAttribute('data-i'), 10);
  switch (a) {
    case 'login': openAuth('signin', S.view === 'create' ? 'Entre para publicar. O que você montou fica aqui nesta página.' : ''); break;
    case 'logout': sb.auth.signOut().then(function () { toast('Você saiu.'); }); break;
    case 'authMode': openAuth(t.getAttribute('data-m')); break;
    case 'closeAuth': closeAuth(); break;
    case 'google': googleLogin(); break;
    case 'explore':
      if (S.view !== 'home') { location.hash = '#/'; setTimeout(function () { scrollToId('explore'); }, 60); } else scrollToId('explore');
      break;
    case 'pick':
      if (!S.draft) S.draft = newDraft(t.getAttribute('data-type')); else S.draft.type = t.getAttribute('data-type');
      location.hash = '#/criar';
      break;
    case 'pickType': S.draft.type = t.getAttribute('data-type'); render(); break;
    case 'filter': S.filter = t.getAttribute('data-f'); renderShelf(); break;
    case 'fs':
      S.fs = Math.min(1.6, Math.max(0.8, Math.round((S.fs + parseFloat(t.getAttribute('data-d'))) * 10) / 10));
      var bk = $('book'); if (bk) bk.style.setProperty('--fs', S.fs);
      break;
    case 'copy':
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(function () { toast('Link copiado.'); }, function () { toast('Copie o endereço da barra do navegador.'); });
      else toast('Copie o endereço da barra do navegador.');
      break;
    case 'pgLeft': move(S.draft.pages, i, -1); setHTML('pagesList', pagesHTML()); break;
    case 'pgRight': move(S.draft.pages, i, 1); setHTML('pagesList', pagesHTML()); break;
    case 'pgDel': URL.revokeObjectURL(S.draft.pages[i].url); S.draft.pages.splice(i, 1); setHTML('pagesList', pagesHTML()); break;
    case 'chAdd': if (S.draft.chapters.length < 80) { S.draft.chapters.push({ title: 'Capítulo ' + (S.draft.chapters.length + 1), text: '' }); setHTML('chList', chaptersHTML()); } break;
    case 'chDel': S.draft.chapters.splice(i, 1); setHTML('chList', chaptersHTML()); break;
    case 'epAdd': if (S.draft.episodes.length < 60) { S.draft.episodes.push({ title: 'Episódio ' + (S.draft.episodes.length + 1), url: '' }); setHTML('epList', episodesHTML()); } break;
    case 'epDel': S.draft.episodes.splice(i, 1); setHTML('epList', episodesHTML()); break;
    case 'askDelete': S.confirmDel = true; render(); break;
    case 'cancelDelete': S.confirmDel = false; render(); break;
    case 'doDelete': deleteWork(); break;
  }
});
document.addEventListener('input', function (e) {
  var el = e.target; if (!S.draft || !el.dataset) return;
  if (el.dataset.f) S.draft[el.dataset.f] = el.value;
  else if (el.dataset.ch !== undefined) S.draft.chapters[+el.dataset.ch][el.dataset.k] = el.value;
  else if (el.dataset.ep !== undefined) S.draft.episodes[+el.dataset.ep][el.dataset.k] = el.value;
});
document.addEventListener('change', function (e) {
  var el = e.target;
  if (el.id === 'coverFile') onCover(el);
  else if (el.id === 'pageFiles') onPages(el);
});
document.addEventListener('submit', function (e) {
  if (e.target.id === 'form') { e.preventDefault(); publish(); }
  else if (e.target.id === 'authForm') { e.preventDefault(); doAuth(); }
});
window.addEventListener('hashchange', route);

/* ---------- começo ---------- */
app.innerHTML = '<div id="hdr"></div><main id="main"></main><div id="ftr"></div>';
if (!window.supabase || !window.supabase.createClient || !C.SUPABASE_URL || !C.SUPABASE_KEY) {
  setHTML('main', '<div class="empty">' + SMILE + '<strong>Não consegui carregar o FliPHut</strong><span class="muted">Falta a biblioteca do Supabase ou o arquivo config.js. Confira se todos os arquivos foram enviados e recarregue.</span></div>');
  renderHeader();
} else {
  sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  sb.auth.onAuthStateChange(function (ev, session) {
    S.session = session;
    setTimeout(function () {
      afterAuth();
      if (ev === 'PASSWORD_RECOVERY') openAuth('recovery', 'Escolha uma nova senha.');
    }, 0);
  });
  route();
  loadWorks();
  sb.auth.getSession().then(function (r) { S.session = r.data && r.data.session; afterAuth(); });
}
})();
