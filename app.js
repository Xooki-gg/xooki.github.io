'use strict';

const DISCORD_ID = '1012943554315817000';

// ── helpers ──────────────────────────────────────────────────────────────────

function setStatus(status) {
  const dot = document.getElementById('statusDot');
  dot.className = 'status-dot ' + (status || 'offline');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function copyHandle(text) {
  navigator.clipboard.writeText(text).then(() => showToast('copied: ' + text));
}

// ── spotify placeholder SVG ───────────────────────────────────────────────────

function setSpotifyPlaceholder(wrap) {
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');

  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10');
  circle.setAttribute('stroke', '#64748b'); circle.setAttribute('stroke-width', '1.5');

  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M8 12a4 4 0 0 1 4-4');
  path.setAttribute('stroke', '#64748b'); path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');

  const dot = document.createElementNS(ns, 'circle');
  dot.setAttribute('cx', '12'); dot.setAttribute('cy', '12'); dot.setAttribute('r', '1.5');
  dot.setAttribute('fill', '#64748b');

  svg.appendChild(circle); svg.appendChild(path); svg.appendChild(dot);
  wrap.appendChild(svg);
}

// ── spotify ───────────────────────────────────────────────────────────────────

function updateSpotify(spotify) {
  const card    = document.getElementById('spotifyCard');
  const label   = card.querySelector('.spotify-label');
  const song    = document.getElementById('spotifySong');
  const artist  = document.getElementById('spotifyArtist');
  const artWrap = document.getElementById('spotifyArtWrap');

  if (spotify) {
    card.classList.add('playing');
    label.textContent  = 'now playing';
    song.textContent   = spotify.song;
    artist.textContent = spotify.artist;

    if (spotify.album_art_url) {
      while (artWrap.firstChild) artWrap.removeChild(artWrap.firstChild);
      const img = document.createElement('img');
      img.className = 'spotify-art';
      img.alt = 'album art';
      img.onerror = () => setSpotifyPlaceholder(artWrap);
      img.src = spotify.album_art_url;
      artWrap.appendChild(img);
    }
  } else {
    card.classList.remove('playing');
    label.textContent  = 'not listening';
    song.textContent   = '—';
    artist.textContent = '';
    setSpotifyPlaceholder(artWrap);
  }
}

// ── presence icon ─────────────────────────────────────────────────────────────

function setPresenceImg(wrap, primarySrc, fallbackSrc) {
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  const img = document.createElement('img');
  img.className = 'presence-icon';
  img.alt = '';
  img.onerror = fallbackSrc
    ? () => { img.onerror = () => { img.style.opacity = '0'; }; img.src = fallbackSrc; }
    : () => { img.style.opacity = '0'; };
  img.src = primarySrc;
  wrap.appendChild(img);
}

function updatePresence(activities) {
  const card     = document.getElementById('presenceCard');
  const nameEl   = document.getElementById('presenceName');
  const detailEl = document.getElementById('presenceDetail');
  const iconWrap = document.getElementById('presenceIconWrap');

  const game = activities.find(a => a.type === 0 || a.type === 1);
  if (game) {
    card.classList.add('visible', 'active');
    nameEl.textContent   = game.name;
    detailEl.textContent = game.details || game.state || '';

    const appId  = game.application_id;
    const rawImg = game.assets?.large_image || game.assets?.small_image;

    if (rawImg && !rawImg.startsWith('spotify:')) {
      const primary = rawImg.startsWith('mp:')
        ? `https://media.discordapp.net/${rawImg.slice(3)}`
        : `https://cdn.discordapp.com/app-assets/${appId}/${rawImg}.png`;
      const fallback = appId ? `https://cdn.discordapp.com/app-icons/${appId}/icon.png` : null;
      setPresenceImg(iconWrap, primary, fallback);
    } else if (appId) {
      setPresenceImg(iconWrap, `https://cdn.discordapp.com/app-icons/${appId}/icon.png`, null);
    }
  } else {
    card.classList.remove('visible', 'active');
  }
}

// ── avatar (robust: update src if already an img) ─────────────────────────────

function updateAvatar(user) {
  const tag = document.getElementById('discordTag');

  if (user.avatar) {
    const ext      = user.avatar.startsWith('a_') ? 'gif' : 'png';
    const src      = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
    const existing = document.getElementById('avatarWrap');

    if (existing.tagName === 'IMG') {
      existing.src = src;
    } else {
      const img = document.createElement('img');
      img.className = 'avatar';
      img.id        = 'avatarWrap';
      img.alt       = 'avatar';
      img.src       = src;
      existing.replaceWith(img);
    }
  }

  if (tag) {
    tag.textContent = (user.discriminator && user.discriminator !== '0')
      ? '#' + user.discriminator
      : '';
  }
}

// ── bio / custom status ───────────────────────────────────────────────────────

function updateBio(customStatus) {
  const bioEl = document.getElementById('bioText');
  if (customStatus && customStatus.state) {
    const emoji = customStatus.emoji?.name ? customStatus.emoji.name + ' ' : '';
    bioEl.textContent = emoji + customStatus.state;
    bioEl.classList.remove('hidden');
  } else {
    bioEl.classList.add('hidden');
  }
}

// ── apply all presence data ───────────────────────────────────────────────────

function applyPresence(d) {
  setStatus(d.discord_status);
  updateAvatar(d.discord_user);
  updateSpotify(d.listening_to_spotify ? d.spotify : null);
  updatePresence(d.activities || []);
  const custom = (d.activities || []).find(a => a.type === 4);
  updateBio(custom);
}

// ── initial fetch ─────────────────────────────────────────────────────────────

async function fetchLanyard() {
  try {
    const res  = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
    const json = await res.json();
    if (json.success) applyPresence(json.data);
  } catch (e) {
    console.warn('Lanyard fetch failed', e);
  }
}

// ── websocket with heartbeat fix + exponential backoff ───────────────────────

let heartbeatTimer = null;
let wsRetryDelay   = 3000;

function connectWS() {
  const ws = new WebSocket('wss://api.lanyard.rest/socket');

  ws.onopen = () => {
    wsRetryDelay = 3000;
    ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.op === 1) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
      }, msg.d.heartbeat_interval);
    }

    if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE')) {
      const d = msg.d[DISCORD_ID] || msg.d;
      if (d) applyPresence(d);
    }
  };

  ws.onclose = () => {
    clearInterval(heartbeatTimer);
    wsRetryDelay = Math.min(wsRetryDelay * 2, 60000);
    setTimeout(connectWS, wsRetryDelay);
  };
}

// ── event listeners (no inline handlers) ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('discordCopy')
    .addEventListener('click', () => copyHandle('xooki_'));

  document.getElementById('handleOW')
    .addEventListener('click', () => copyHandle('Xoōki#1412'));

  document.getElementById('handleVal')
    .addEventListener('click', () => copyHandle('Xooki#Nei'));

  fetchLanyard();
  connectWS();
});
