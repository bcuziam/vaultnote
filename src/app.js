import { VaultCrypto } from './crypto.js';
import { VaultStorage } from './storage.js';

// ============================================================================
// Initial Default State
// ============================================================================
function createInitialState() {
  const now = new Date().toISOString();
  return {
    version: 3,
    folders: [
      { id: 'f_work', name: '업무 · 프로젝트' },
      { id: 'f_idea', name: '아이디어 · 기획' },
      { id: 'f_clip', name: '웹 스크랩' },
      { id: 'f_personal', name: '개인 노트' },
      { id: 'f_security', name: '보안 폴더' }
    ],
    notes: [
      {
        id: 'n_welcome',
        title: 'VaultNote 시작하기',
        folderId: 'f_work',
        docType: 'note',
        status: 'in_progress',
        priority: 'normal',
        favorite: true,
        trashed: false,
        isEncrypted: false,
        tags: ['가이드', '메모'],
        createdAt: now,
        updatedAt: now,
        blocks: [
          {
            id: 'b1',
            type: 'callout',
            text: '글쓰기와 정리에만 집중할 수 있도록 구성된 워크스페이스입니다. 좌측 메뉴(전체 노트, 중요 노트, 폴더)를 누르면 노트 목록이 나타나고, 노트를 클릭하면 넓은 편집 화면이 열립니다.'
          },
          {
            id: 'b2',
            type: 'h2',
            text: '핵심 작성 방법'
          },
          {
            id: 'b3',
            type: 'todo',
            checked: true,
            text: '빈 줄에서 / 를 입력하거나 줄 왼쪽의 + 버튼을 누르면 블록 전환 및 줄 이동/삭제 메뉴가 열립니다.'
          },
          {
            id: 'b4',
            type: 'todo',
            checked: false,
            text: '마크다운 자동 변환: # 제목1, ## 제목2, - 목록, [] 할일, > 인용박스, --- 구분선'
          },
          {
            id: 'b5',
            type: 'todo',
            checked: false,
            text: '대괄호 두 개로 다른 문서를 연결합니다: [[동기화 및 보안 안내]]'
          },
          {
            id: 'b6',
            type: 'toggle',
            text: '화면 넓게 쓰기 및 분할 보기 안내',
            details: '• 상단 [◧ 메뉴] 버튼(단축키 Ctrl+\\)으로 좌측 사이드바를 접을 수 있습니다.\n• 상단 [↔ 폭] 버튼으로 문서 폭을 넓게 전환할 수 있습니다.\n• 상단 [분할] 버튼을 누르면 오른쪽에 다른 노트를 나란히 띄워 비교하며 작성할 수 있습니다.',
            open: true
          }
        ]
      },
      {
        id: 'n_security_sync',
        title: '동기화 및 보안 안내',
        folderId: 'f_personal',
        docType: 'note',
        status: 'done',
        priority: 'normal',
        favorite: true,
        trashed: false,
        isEncrypted: false,
        tags: ['보안', '동기화'],
        createdAt: now,
        updatedAt: now,
        blocks: [
          {
            id: 'bs1',
            type: 'h2',
            text: '원드라이브 · 구글 드라이브 동기화'
          },
          {
            id: 'bs2',
            type: 'bullet',
            text: '좌측 하단 [동기화] 메뉴에서 내 PC의 OneDrive 또는 Google Drive 폴더를 지정하면 수정 시마다 자동 저장됩니다.'
          },
          {
            id: 'bs3',
            type: 'bullet',
            text: '외부 PC나 모바일(갤럭시 Z폴드 7)에서는 클라우드 API 또는 데이터 파일(.json) 불러오기로 동일하게 이어서 작업할 수 있습니다.'
          },
          {
            id: 'bs4',
            type: 'h2',
            text: '2중 보안 및 암호화'
          },
          {
            id: 'bs5',
            type: 'bullet',
            text: '노트 상단 메타바의 [암호화] 버튼을 누르거나 좌측 [보안 금고]에 저장한 내용은 AES-256-GCM으로 암호화됩니다.'
          },
          {
            id: 'bs6',
            type: 'p',
            text: '기본 사용법은 [[VaultNote 시작하기]] 문서를 참고하세요.'
          }
        ]
      },
      {
        id: 'n_idea_sample',
        title: '프로젝트 아이디어 메모',
        folderId: 'f_idea',
        docType: 'idea',
        status: 'todo',
        priority: 'normal',
        favorite: false,
        trashed: false,
        isEncrypted: false,
        tags: ['아이디어'],
        createdAt: now,
        updatedAt: now,
        blocks: [
          {
            id: 'bi1',
            type: 'p',
            text: '떠오르는 아이디어나 웹 스크랩 내용을 자유롭게 정리해보세요.'
          }
        ]
      }
    ],
    vaultItems: [],
    scratchpad: '',
    orderUpdatedAt: now,
    settings: {
      theme: 'dark',
      fullWidth: false,
      sidebarCollapsed: false,
      appLockVerifier: null,
      vaultMasterVerifier: null,
      autoLockMinutes: 5,
      pcVaultDir: '',
      autoPcSync: true,
      onedriveToken: '',
      gdriveToken: '',
      geminiApiKey: ''
    }
  };
}

// ============================================================================
// Runtime State
// ============================================================================
let state = createInitialState();
let activeNav = 'all'; // 'all', 'favorites', 'vault', 'clipper', 'graph', 'trash', 'folder:<id>', 'tag:<tag>'
let activeViewMode = 'editor'; // 'list', 'editor', 'split', 'table', 'kanban'
let activeNoteId = null;
let secondaryNoteId = null;
let slashTargetBlockId = null;

let unlockedVaultPassword = null;
let decryptedVaultItemsCache = [];
let decryptedNotesSessionMap = new Map();
let activeVaultCategory = 'all';
let idleTimer = null;
let draggedNoteId = null;
let draggedBlockId = null;
let selectedBlockIds = new Set();
let lastSelectedBlockId = null;
let lastTrashedNoteIds = [];
let isSidebarTagsExpanded = false;

// ============================================================================
// Utility Functions
// ============================================================================
function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function showToast(msg, duration = 2400, actionLabel = null, onAction = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const span = document.createElement('span');
  span.textContent = msg;
  el.appendChild(span);

  if (actionLabel && typeof onAction === 'function') {
    const actBtn = document.createElement('button');
    actBtn.type = 'button';
    actBtn.className = 'toast-action-btn';
    actBtn.textContent = actionLabel;
    actBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      onAction();
    });
    el.appendChild(actBtn);
  }

  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function undoLastNoteTrash() {
  if (lastTrashedNoteIds.length === 0) return false;
  const noteId = lastTrashedNoteIds.pop();
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || !note.trashed) return false;
  lastLocalMutationTime = Date.now();
  note.trashed = false;
  note.updatedAt = new Date().toISOString();
  activeNoteId = note.id;
  scheduleSave(true, true);
  renderAll();
  showToast(`'${note.title || '제목 없음'}' 노트가 복원되었습니다.`);
  return true;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function extractWikiLinks(text = '') {
  const matches = [];
  const regex = /\[\[([^\[\]]+)\]\]/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m[1].trim()) matches.push(m[1].trim());
  }
  return matches;
}

function extractWebUrls(text = '') {
  const urls = [];
  const seen = new Set();
  const regex = /https?:\/\/[^\s<>"')\]}]+/gi;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const cleanUrl = m[0].replace(/[.,;:!?]+$/, '');
    if (cleanUrl && !seen.has(cleanUrl)) {
      seen.add(cleanUrl);
      urls.push(cleanUrl);
    }
  }
  return urls;
}

async function detectClipboardSourceUrl(clipboardData) {
  const html = clipboardData?.getData?.('text/html') || '';
  const plain = clipboardData?.getData?.('text/plain') || '';

  // 1. Check if HTML or plain text already has an explicit SourceURL header or '출처:' line
  const directMatch =
    html.match(/SourceURL:(\S+)/i) ||
    html.match(/<base[^>]+href=["'](https?:\/\/[^"']+)["']/i) ||
    plain.match(/(?:출처|원문)\s*[:：]\s*(https?:\/\/\S+)/i);
  if (directMatch && directMatch[1]) {
    return directMatch[1].trim();
  }

  // 2. If rich HTML was copied from a browser, ask local server for Windows CF_HTML SourceURL
  if (html && html.length > 10) {
    try {
      const res = await fetch('/api/clipboard-source').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.sourceUrl) {
          return data.sourceUrl.trim();
        }
      }
    } catch {}
  }

  return '';
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripLeadingEmojis(str = '') {
  return String(str).replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s]+/gu, '').trim() || str;
}

function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightSearchTerm(text, query) {
  if (!query || !text) return escapeHtml(text || '');
  const rawText = String(text);
  const q = query.trim();
  if (!q) return escapeHtml(rawText);

  const regex = new RegExp(`(${escapeRegExp(q)})`, 'gi');
  const parts = rawText.split(regex);
  return parts.map((part) => {
    if (part.toLowerCase() === q.toLowerCase()) {
      return `<mark class="search-highlight">${escapeHtml(part)}</mark>`;
    }
    return escapeHtml(part);
  }).join('');
}

function highlightHtmlText(html, query) {
  if (!query || !html) return html || '';
  const q = query.trim();
  if (!q) return html;
  const escaped = escapeRegExp(q);
  const re = new RegExp(`(${escaped})`, 'gi');
  const parts = String(html).split(/(<[^>]+>)/g);
  return parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) return part;
    return part.replace(re, '<mark class="search-highlight">$1</mark>');
  }).join('');
}

function getNotePlainSnippet(note, query = '') {
  if (!note) return '';
  if (note.isEncrypted) return 'AES-256 암호화로 잠긴 노트입니다.';
  const blocks = note.blocks || [];

  // 검색어가 있을 경우 검색어가 포함된 블록(이미지 OCR 포함)의 문맥을 최우선으로 발췌
  if (query) {
    const qLower = query.toLowerCase();
    for (const b of blocks) {
      if (b.type === 'image' && b.ocrText && b.ocrText.toLowerCase().includes(qLower)) {
        const idx = b.ocrText.toLowerCase().indexOf(qLower);
        const start = Math.max(0, idx - 25);
        const end = Math.min(b.ocrText.length, idx + query.length + 55);
        const snippet = b.ocrText.slice(start, end);
        return (start > 0 ? '...' : '') + `📷 [이미지 내 텍스트] ` + snippet + (end < b.ocrText.length ? '...' : '');
      }
      const txt = (b.text || '').trim();
      if (txt && txt.toLowerCase().includes(qLower)) {
        const idx = txt.toLowerCase().indexOf(qLower);
        const start = Math.max(0, idx - 25);
        const end = Math.min(txt.length, idx + query.length + 65);
        const snippet = txt.slice(start, end);
        return (start > 0 ? '...' : '') + snippet + (end < txt.length ? '...' : '');
      }
      const details = (b.details || '').trim();
      if (details && details.toLowerCase().includes(qLower)) {
        const idx = details.toLowerCase().indexOf(qLower);
        const start = Math.max(0, idx - 25);
        const end = Math.min(details.length, idx + query.length + 65);
        const snippet = details.slice(start, end);
        return (start > 0 ? '...' : '') + snippet + (end < details.length ? '...' : '');
      }
    }
  }

  for (const b of blocks) {
    const txt = (b.text || '').trim();
    if (!txt) continue;
    if (b.type === 'callout' && txt.startsWith('출처:')) continue;
    if ((b.type === 'h1' || b.type === 'h2' || b.type === 'h3') && (txt === '핵심 요약' || txt === '본문 내용')) continue;
    return txt.slice(0, 130);
  }
  for (const b of blocks) {
    if (b.text && b.text.trim()) return b.text.trim().slice(0, 120);
    if (b.type === 'image' && b.ocrText) return '📷 [이미지 텍스트] ' + b.ocrText.slice(0, 120);
  }
  return '본문 내용 없음';
}

function getCurrentNavTitle() {
  if (activeNav === 'all') return '전체 노트';
  if (activeNav === 'favorites') return '중요 노트';
  if (activeNav === 'trash') return '휴지통';
  if (activeNav === 'vault') return '보안 금고';
  if (activeNav === 'clipper') return '웹 클리퍼';
  if (activeNav === 'graph') return '연결 그래프';
  if (activeNav.startsWith('folder:')) {
    const f = state.folders.find((fl) => fl.id === activeNav.slice(7));
    return f ? f.name : '폴더';
  }
  if (activeNav.startsWith('tag:')) {
    return `#${activeNav.slice(4)}`;
  }
  return '전체 노트';
}

// ============================================================================
// Persistence & Auto Cloud Sync
// ============================================================================
let saveDebounceTimer = null;
let lastSyncedMtimeMs = 0;
let isSyncingLive = false;
let lastLocalMutationTime = 0;

async function pushLiveSyncState() {
  if (isSyncingLive) return;
  isSyncingLive = true;
  try {
    const res = await fetch('/api/live-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultDir: state.settings.pcVaultDir || '',
        data: state
      })
    }).catch(() => null);
    if (res && res.ok) {
      const json = await res.json();
      if (json && json.mtimeMs) {
        lastSyncedMtimeMs = json.mtimeMs;
      }
    }
  } catch {} finally {
    isSyncingLive = false;
  }
}

function hasNewerRemoteNotes(remoteNotes, localNotes, remoteOrderUpdatedAt = null, localOrderUpdatedAt = null) {
  if (!Array.isArray(remoteNotes)) return false;
  if (!Array.isArray(localNotes)) return true;

  // 1. 순서 변경 감지: 원격의 orderUpdatedAt이 로컬보다 최신이고 실제 노트 순서가 다르면 즉시 동기화 대상으로 판정
  if (remoteOrderUpdatedAt && localOrderUpdatedAt) {
    const rOTime = new Date(remoteOrderUpdatedAt).getTime();
    const lOTime = new Date(localOrderUpdatedAt).getTime();
    if (rOTime > lOTime + 300) {
      const rIds = remoteNotes.map((n) => n.id).join(',');
      const lIds = localNotes.map((n) => n.id).join(',');
      if (rIds !== lIds) return true;
    }
  }

  const localMap = new Map(localNotes.map((n) => [n.id, n]));
  for (const rNote of remoteNotes) {
    const lNote = localMap.get(rNote.id);
    if (!lNote) return true; // 원격에서 새로 생성된 노트
    const rTime = new Date(rNote.updatedAt || 0).getTime();
    const lTime = new Date(lNote.updatedAt || 0).getTime();
    if (rTime > lTime + 300) return true; // 원격에서 개별 수정된 노트
  }
  for (const lNote of localNotes) {
    const rNote = remoteNotes.find((n) => n.id === lNote.id);
    if (!rNote) return true; // 원격에서 완전히 삭제/정리된 노트
    // trashed 상태가 다를 때는 원격이 더 최신일 때만 업데이트로 판정
    if (Boolean(rNote.trashed) !== Boolean(lNote.trashed)) {
      const rTime = new Date(rNote.updatedAt || 0).getTime();
      const lTime = new Date(lNote.updatedAt || 0).getTime();
      if (rTime > lTime) return true;
    }
  }
  return false;
}

function isSidebarCollapsedOnDevice() {
  const isMobile = window.innerWidth <= 820;
  if (isMobile) {
    // 스마트폰은 항상 닫힌 상태가 기본 (화면 확보)
    const saved = sessionStorage.getItem('vaultnote_sidebar_mobile');
    return saved === null ? true : saved === '1';
  } else {
    // 노트북/PC는 항상 펼쳐진 상태가 기본 (메뉴바 항시 표시)
    const saved = localStorage.getItem('vaultnote_sidebar_pc');
    return saved === '1'; // 저장값 없으면 false (펼쳐짐)
  }
}

async function applyRemoteSyncedState(remoteState, label = '실시간 동기화됨') {
  if (!remoteState || !Array.isArray(remoteState.notes)) return false;
  const prevActiveId = activeNoteId;
  const localTheme = localStorage.getItem('vaultnote_theme') || state.settings?.theme || 'dark';
  // Preserve local tokens/keys and device-specific theme if remote doesn't have them or differs
  const mergedSettings = {
    ...createInitialState().settings,
    ...(state.settings || {}),
    ...(remoteState.settings || {}),
    theme: localTheme, // 기기별 독립 테마 설정 보존 (클라우드가 로컬 테마를 덮어쓰지 않음)
    sidebarCollapsed: isSidebarCollapsedOnDevice(), // 기기별 메뉴바 독립 유지 (클라우드가 덮어쓰지 않음)
    onedriveToken: remoteState.settings?.onedriveToken || state.settings?.onedriveToken || '',
    gdriveToken: remoteState.settings?.gdriveToken || state.settings?.gdriveToken || '',
    geminiApiKey: remoteState.settings?.geminiApiKey || state.settings?.geminiApiKey || ''
  };

  // Smart note-level merge: 기기 간 순서 타임스탬프를 비교하여 최신 순서를 우선하되, 개별 노트 내용은 최신 수정본 보존
  const rOrderTime = new Date(remoteState.orderUpdatedAt || 0).getTime();
  const lOrderTime = new Date(state.orderUpdatedAt || 0).getTime();
  const preferRemoteOrder = rOrderTime > lOrderTime;

  const primaryNotes = preferRemoteOrder ? (remoteState.notes || []) : (state.notes || []);
  const secondaryNotes = preferRemoteOrder ? (state.notes || []) : (remoteState.notes || []);
  const secondaryMap = new Map(secondaryNotes.map((n) => [n.id, n]));

  const mergedNotes = [];
  const processedIds = new Set();

  for (const pNote of primaryNotes) {
    const sNote = secondaryMap.get(pNote.id);
    if (sNote) {
      const pTime = new Date(pNote.updatedAt || 0).getTime();
      const sTime = new Date(sNote.updatedAt || 0).getTime();
      // 내용/제목은 둘 중 더 최신에 수정된 노트를 온전히 채택
      mergedNotes.push(sTime > pTime ? sNote : pNote);
    } else {
      mergedNotes.push(pNote);
    }
    processedIds.add(pNote.id);
  }

  for (const sNote of secondaryNotes) {
    if (!processedIds.has(sNote.id)) {
      mergedNotes.unshift(sNote);
      processedIds.add(sNote.id);
    }
  }

  const remoteFolderIds = new Set((remoteState.folders || []).map((f) => f.id));
  const mergedFolders = [...(remoteState.folders || [])];
  for (const lFolder of (state.folders || [])) {
    if (!remoteFolderIds.has(lFolder.id)) {
      mergedFolders.push(lFolder);
    }
  }

  const latestMtime = Math.max(
    new Date(remoteState.lastSavedAt || 0).getTime(),
    new Date(state.lastSavedAt || 0).getTime()
  );
  const latestOrderTime = Math.max(rOrderTime, lOrderTime);

  state = {
    ...createInitialState(),
    ...remoteState,
    notes: mergedNotes,
    folders: mergedFolders.length > 0 ? mergedFolders : state.folders,
    settings: mergedSettings,
    lastSavedAt: new Date(latestMtime).toISOString(),
    orderUpdatedAt: new Date(latestOrderTime || latestMtime).toISOString()
  };
  if (prevActiveId && state.notes.some((n) => n.id === prevActiveId && !n.trashed)) {
    activeNoteId = prevActiveId;
  } else {
    activeNoteId = state.notes.find((n) => !n.trashed)?.id || null;
  }
  await VaultStorage.saveState(state, false);
  renderAll(true);
  const indicator = document.getElementById('save-indicator');
  if (indicator) indicator.textContent = label;
  return true;
}

let hasPendingCloudSync = false;
try {
  hasPendingCloudSync = localStorage.getItem('vaultnote_pending_cloud_sync') === '1';
} catch (_) {}

async function flushPendingCloudSyncIfAny() {
  if (!hasPendingCloudSync) return false;
  const hasToken = (state.settings.gdriveToken || '').trim() || (state.settings.onedriveToken || '').trim();
  if (!hasToken) return false;
  scheduleSave(true, true);
  return true;
}

async function pullLiveSyncStateIfNewer(isInitial = false) {
  if (isSyncingLive) return false;

  // 오프라인 동안 작성/수정되어 아직 클라우드에 못 올린 데이터가 있다면 즉시 업로드 시도
  if (hasPendingCloudSync) {
    flushPendingCloudSyncIfAny();
  }

  // 로컬에서 삭제/수정이 발생한 직후 2.5초간은 아직 업로드 완료되지 않은 과거 클라우드 데이터 수신 차단
  if (!isInitial && Date.now() - lastLocalMutationTime < 2500) {
    return false;
  }
  isSyncingLive = true;
  try {
    // 1. OneDrive or Google Drive Cloud API Auto-Pull (works on GitHub Pages, Smartphone Web App, and External PCs without any PC software installed)
    const gdToken = (state.settings.gdriveToken || '').trim();
    if (gdToken) {
      try {
        const remoteGD = await VaultStorage.syncGoogleDriveAPI(gdToken, state, 'load');
        if (remoteGD === null && isInitial) {
          await VaultStorage.syncGoogleDriveAPI(gdToken, state, 'save');
        } else if (remoteGD && Array.isArray(remoteGD.notes)) {
          const remoteTime = new Date(remoteGD.lastSavedAt || 0).getTime();
          const localTime = new Date(state.lastSavedAt || 0).getTime();
          const rOrderTime = new Date(remoteGD.orderUpdatedAt || 0).getTime();
          const lOrderTime = new Date(state.orderUpdatedAt || 0).getTime();
          const hasUpdates = hasNewerRemoteNotes(remoteGD.notes, state.notes, remoteGD.orderUpdatedAt, state.orderUpdatedAt);
          if (isInitial || remoteTime > localTime + 300 || rOrderTime > lOrderTime + 300 || hasUpdates) {
            await applyRemoteSyncedState(remoteGD, 'Google Drive 자동 동기화됨');
            return true;
          }
        }
      } catch {}
    }

    const odToken = (state.settings.onedriveToken || '').trim();
    if (odToken) {
      try {
        const remoteOD = await VaultStorage.syncOneDriveAPI(odToken, state, 'load');
        if (remoteOD === null && isInitial) {
          await VaultStorage.syncOneDriveAPI(odToken, state, 'save');
        } else if (remoteOD && Array.isArray(remoteOD.notes)) {
          const remoteTime = new Date(remoteOD.lastSavedAt || 0).getTime();
          const localTime = new Date(state.lastSavedAt || 0).getTime();
          const rOrderTime = new Date(remoteOD.orderUpdatedAt || 0).getTime();
          const lOrderTime = new Date(state.orderUpdatedAt || 0).getTime();
          const hasUpdates = hasNewerRemoteNotes(remoteOD.notes, state.notes, remoteOD.orderUpdatedAt, state.orderUpdatedAt);
          if (isInitial || remoteTime > localTime + 300 || rOrderTime > lOrderTime + 300 || hasUpdates) {
            await applyRemoteSyncedState(remoteOD, 'OneDrive 자동 동기화됨');
            return true;
          }
        }
      } catch {}
    }

    // 2. Browser Direct OneDrive Folder Handle Auto-Pull (works on Chrome/Edge PC even on GitHub Pages)
    try {
      const folderState = await VaultStorage.loadFromBrowserDirectory();
      if (folderState && Array.isArray(folderState.notes)) {
        const remoteTime = new Date(folderState.lastSavedAt || 0).getTime();
        const localTime = new Date(state.lastSavedAt || 0).getTime();
        const rOrderTime = new Date(folderState.orderUpdatedAt || 0).getTime();
        const lOrderTime = new Date(state.orderUpdatedAt || 0).getTime();
        const hasUpdates = hasNewerRemoteNotes(folderState.notes, state.notes, folderState.orderUpdatedAt, state.orderUpdatedAt);
        if (remoteTime > localTime + 300 || rOrderTime > lOrderTime + 300 || hasUpdates) {
          await applyRemoteSyncedState(folderState, 'OneDrive 폴더 동기화됨');
          return true;
        }
      }
    } catch {}

    // 3. Local PC Bridge Auto-Pull (when running via local server.js)
    const dirParam = encodeURIComponent(state.settings.pcVaultDir || '');
    const metaRes = await fetch(`/api/live-sync?meta=1&dir=${dirParam}`).catch(() => null);
    if (!metaRes || !metaRes.ok) return false;
    const meta = await metaRes.json();
    if (!meta || !meta.ok) return false;

    if (meta.empty) {
      if (isInitial) {
        isSyncingLive = false;
        await pushLiveSyncState();
      }
      return false;
    }

    if (meta.mtimeMs && meta.mtimeMs > lastSyncedMtimeMs + 100) {
      const fullRes = await fetch(`/api/live-sync?dir=${dirParam}`).catch(() => null);
      if (!fullRes || !fullRes.ok) return false;
      const fullData = await fullRes.json();
      if (fullData && fullData.ok && fullData.data && Array.isArray(fullData.data.notes)) {
        lastSyncedMtimeMs = fullData.mtimeMs || meta.mtimeMs;
        await applyRemoteSyncedState(fullData.data, '실시간 동기화됨');
        return true;
      }
    }
  } catch {} finally {
    isSyncingLive = false;
  }
  return false;
}

function scheduleSave(triggerCloud = true, immediate = false) {
  const indicator = document.getElementById('save-indicator');
  if (indicator && triggerCloud) indicator.textContent = '저장 중...';

  clearTimeout(saveDebounceTimer);
  const executeSave = async () => {
    if (triggerCloud) {
      state.lastSavedAt = new Date().toISOString();
    }
    const savedPayload = await VaultStorage.saveState(state, triggerCloud);
    state.lastSavedAt = savedPayload.lastSavedAt;
    if (indicator && triggerCloud) indicator.textContent = '저장됨';

    if (triggerCloud) {
      await pushLiveSyncState();

      // Save to Browser-linked OneDrive folder if granted
      VaultStorage.saveToBrowserDirectory(state).catch(() => {});

      if (state.settings.autoPcSync && state.settings.pcVaultDir) {
        try {
          const res = await VaultStorage.syncWithPCFolder(state.settings.pcVaultDir, state, 'save');
          if (res && res.ok) {
            if (indicator) indicator.textContent = 'OneDrive 동기화됨';
            const badge = document.getElementById('sync-status-badge');
            if (badge) badge.textContent = 'OneDrive 연동중';
          }
        } catch {}
      }

      // If OneDrive or Google Drive API Token is saved, automatically upload on every edit
      if ((state.settings.onedriveToken || '').trim()) {
        VaultStorage.syncOneDriveAPI(state.settings.onedriveToken, state, 'save')
          .then(() => {
            hasPendingCloudSync = false;
            try { localStorage.removeItem('vaultnote_pending_cloud_sync'); } catch (_) {}
            if (indicator) indicator.textContent = 'OneDrive 자동 저장됨';
            const badge = document.getElementById('sync-status-badge');
            if (badge) badge.textContent = 'OneDrive 연동중';
          })
          .catch(() => {
            hasPendingCloudSync = true;
            try { localStorage.setItem('vaultnote_pending_cloud_sync', '1'); } catch (_) {}
            if (indicator) indicator.textContent = '오프라인 저장됨 (온라인 시 자동 동기화)';
            const badge = document.getElementById('sync-status-badge');
            if (badge) badge.textContent = '오프라인 (동기화 대기)';
          });
      }
      if ((state.settings.gdriveToken || '').trim()) {
        VaultStorage.syncGoogleDriveAPI(state.settings.gdriveToken, state, 'save')
          .then(() => {
            hasPendingCloudSync = false;
            try { localStorage.removeItem('vaultnote_pending_cloud_sync'); } catch (_) {}
            if (indicator) indicator.textContent = 'Google Drive 자동 저장됨';
            const badge = document.getElementById('sync-status-badge');
            if (badge) badge.textContent = 'Google Drive 연동중';
          })
          .catch(() => {
            hasPendingCloudSync = true;
            try { localStorage.setItem('vaultnote_pending_cloud_sync', '1'); } catch (_) {}
            if (indicator) indicator.textContent = '오프라인 저장됨 (온라인 시 자동 동기화)';
            const badge = document.getElementById('sync-status-badge');
            if (badge) badge.textContent = '오프라인 (동기화 대기)';
          });
      }
    }
  };

  if (immediate) {
    executeSave();
  } else {
    saveDebounceTimer = setTimeout(executeSave, 1000); // 1000ms(1초) 타이핑 안정 디바운스
  }
}

// ============================================================================
// Security & Idle Auto-Lock
// ============================================================================
function resetIdleTimer() {
  clearTimeout(idleTimer);
  const mins = Number(state.settings.autoLockMinutes || 0);
  if (mins > 0 && (state.settings.appLockVerifier || unlockedVaultPassword)) {
    idleTimer = setTimeout(() => {
      lockEverything('자리 비움 자동 잠금이 실행되었습니다.');
    }, mins * 60 * 1000);
  }
}

async function lockEverything(reasonMsg = '화면이 잠금 상태로 전환되었습니다.', allowPromptSetup = false) {
  unlockedVaultPassword = null;
  decryptedVaultItemsCache = [];
  decryptedNotesSessionMap.clear();

  const vaultIndicator = document.getElementById('vault-lock-indicator');
  if (vaultIndicator) vaultIndicator.textContent = '잠김';

  let hasVerifier = Boolean(state.settings.appLockVerifier || state.settings.vaultMasterVerifier);
  if (!hasVerifier && allowPromptSetup) {
    const newPass = prompt('화면을 잠글 비밀번호를 설정해주세요 (이후 [잠금] 버튼을 누르면 즉시 화면 전체가 가려집니다):');
    if (newPass && newPass.trim()) {
      state.settings.appLockVerifier = await VaultCrypto.createVerifier(newPass.trim());
      scheduleSave();
      hasVerifier = true;
    } else {
      renderAll();
      showToast('잠금 비밀번호 설정이 취소되었습니다.');
      return;
    }
  }

  if (hasVerifier) {
    document.getElementById('app-lock-overlay').classList.remove('hidden');
    document.getElementById('app-lock-input').value = '';
    setTimeout(() => document.getElementById('app-lock-input')?.focus(), 20);
  }

  renderAll();
  showToast(reasonMsg);
}

// ============================================================================
// Filtering, Sorting & Drag-Reordering Notes
// ============================================================================
function getFilteredNotes() {
  const sidebarQuery = (document.getElementById('inline-filter-input')?.value || '').trim().toLowerCase();
  const listViewQuery = (document.getElementById('list-view-search')?.value || '').trim().toLowerCase();
  const query = listViewQuery || sidebarQuery;
  const sortMode = document.getElementById('sort-select')?.value || 'custom';

  let list = state.notes.filter((n) => {
    if (activeNav === 'trash') return Boolean(n.trashed);
    if (n.trashed) return false;
    if (activeNav === 'favorites') return Boolean(n.favorite);
    if (activeNav.startsWith('folder:')) return n.folderId === activeNav.slice(7);
    if (activeNav.startsWith('tag:')) return (n.tags || []).includes(activeNav.slice(4));
    return true;
  });

  if (query) {
    list = list.filter((n) => {
      const inTitle = (n.title || '').toLowerCase().includes(query);
      const inTags = (n.tags || []).some((t) => (`#${t}`).toLowerCase().includes(query) || t.toLowerCase().includes(query));
      const inBlocks = !n.isEncrypted && (n.blocks || []).some((b) => {
        const textMatch = (b.text || '').toLowerCase().includes(query) || (b.details || '').toLowerCase().includes(query);
        const ocrMatch = b.type === 'image' && (b.ocrText || '').toLowerCase().includes(query);
        return textMatch || ocrMatch;
      });
      return inTitle || inTags || inBlocks;
    });
  }

  if (sortMode !== 'custom') {
    list.sort((a, b) => {
      if (sortMode === 'title_asc') {
        return (a.title || '제목 없음').localeCompare(b.title || '제목 없음', 'ko');
      }
      if (sortMode === 'created_desc') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortMode === 'fav_first') {
        if (Boolean(b.favorite) !== Boolean(a.favorite)) return b.favorite ? 1 : -1;
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      }
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }

  return list;
}

function reorderNoteInState(sourceId, targetId, placeAfter = false) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const fromIdx = state.notes.findIndex((n) => n.id === sourceId);
  if (fromIdx === -1) return;
  const [movedNote] = state.notes.splice(fromIdx, 1);

  const toIdx = state.notes.findIndex((n) => n.id === targetId);
  if (toIdx === -1) {
    state.notes.unshift(movedNote);
  } else {
    state.notes.splice(placeAfter ? toIdx + 1 : toIdx, 0, movedNote);
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect && sortSelect.value !== 'custom') {
    sortSelect.value = 'custom';
  }
  lastLocalMutationTime = Date.now();
  state.orderUpdatedAt = new Date().toISOString();
  scheduleSave(true, true);
  renderAll();
}

function attachNoteRowDragEvents(el, noteId) {
  // 1. PC 마우스용 표준 드래그 앤 드롭
  el.draggable = true;
  el.addEventListener('dragstart', (e) => {
    draggedNoteId = noteId;
    el.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', noteId);
    }
  });
  el.addEventListener('dragend', () => {
    draggedNoteId = null;
    el.classList.remove('dragging');
    document.querySelectorAll('.drop-target-top, .drop-target-bottom, .folder-drop-hover').forEach((node) => {
      node.classList.remove('drop-target-top', 'drop-target-bottom', 'folder-drop-hover');
    });
  });
  el.addEventListener('dragover', (e) => {
    if (!draggedNoteId || draggedNoteId === noteId) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const isAfter = e.clientY > rect.top + rect.height / 2;
    el.classList.toggle('drop-target-top', !isAfter);
    el.classList.toggle('drop-target-bottom', isAfter);
  });
  el.addEventListener('dragleave', () => {
    el.classList.remove('drop-target-top', 'drop-target-bottom');
  });
  el.addEventListener('drop', (e) => {
    if (!draggedNoteId || draggedNoteId === noteId) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = el.getBoundingClientRect();
    const isAfter = e.clientY > rect.top + rect.height / 2;
    el.classList.remove('drop-target-top', 'drop-target-bottom');
    const srcId = draggedNoteId;
    draggedNoteId = null;
    reorderNoteInState(srcId, noteId, isAfter);
  });

  // 2. 스마트폰 및 터치스크린용 손가락 터치 드래그 엔진
  const handle = el.querySelector('.drag-handle');
  if (handle) {
    let currentDropTarget = null;
    let isDropAfter = false;
    let touchMoved = false;

    const clearTouchIndicators = () => {
      document.querySelectorAll('.drop-target-top, .drop-target-bottom, .folder-drop-hover').forEach((node) => {
        node.classList.remove('drop-target-top', 'drop-target-bottom', 'folder-drop-hover');
      });
    };

    handle.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      draggedNoteId = noteId;
      touchMoved = false;
      el.classList.add('dragging');
      if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch (_) {}
      }
    }, { passive: false });

    handle.addEventListener('touchmove', (e) => {
      if (!draggedNoteId || draggedNoteId !== noteId) return;
      touchMoved = true;
      if (e.cancelable) e.preventDefault(); // 터치 드래그 시 화면 스크롤 방지
      e.stopPropagation();

      const touch = e.touches[0];
      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!elemBelow) return;

      const targetRow = elemBelow.closest('.main-note-item, .note-list-row');
      clearTouchIndicators();

      if (targetRow && targetRow !== el) {
        currentDropTarget = targetRow;
        const rect = targetRow.getBoundingClientRect();
        isDropAfter = touch.clientY > rect.top + rect.height / 2;
        targetRow.classList.toggle('drop-target-top', !isDropAfter);
        targetRow.classList.toggle('drop-target-bottom', isDropAfter);
      } else {
        currentDropTarget = null;
      }
    }, { passive: false });

    const finishTouchDrag = (e) => {
      if (!draggedNoteId || draggedNoteId !== noteId) return;
      e.stopPropagation();
      el.classList.remove('dragging');
      clearTouchIndicators();

      if (touchMoved && currentDropTarget) {
        const targetId = currentDropTarget.dataset.noteId || currentDropTarget.dataset.quickNoteId;
        if (targetId && targetId !== noteId) {
          reorderNoteInState(noteId, targetId, isDropAfter);
        }
      }
      draggedNoteId = null;
      currentDropTarget = null;
      touchMoved = false;
    };

    handle.addEventListener('touchend', finishTouchDrag);
    handle.addEventListener('touchcancel', () => {
      el.classList.remove('dragging');
      clearTouchIndicators();
      draggedNoteId = null;
      currentDropTarget = null;
      touchMoved = false;
    });
  }
}

// ============================================================================
// Rendering Sidebar & Quick Notes
// ============================================================================
function renderSidebar() {
  const activeNotes = state.notes.filter((n) => !n.trashed);
  document.getElementById('count-all').textContent = activeNotes.length;
  document.getElementById('count-fav').textContent = activeNotes.filter((n) => n.favorite).length;
  document.getElementById('count-trash').textContent = state.notes.filter((n) => n.trashed).length;

  // Folders
  const folderListEl = document.getElementById('folder-list');
  folderListEl.innerHTML = '';
  for (const f of state.folders) {
    const count = activeNotes.filter((n) => n.folderId === f.id).length;
    const row = document.createElement('div');
    row.className = 'folder-item-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `nav-item ${activeNav === `folder:${f.id}` ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="nav-label">${escapeHtml(f.name)}</span>
      <span class="nav-count">${count}</span>
    `;
    btn.addEventListener('click', () => {
      selectCategoryNav(`folder:${f.id}`);
    });
    // Allow dropping a dragged note onto a folder to move it
    btn.addEventListener('dragover', (e) => {
      if (!draggedNoteId) return;
      e.preventDefault();
      btn.classList.add('folder-drop-hover');
    });
    btn.addEventListener('dragleave', () => {
      btn.classList.remove('folder-drop-hover');
    });
    btn.addEventListener('drop', (e) => {
      if (!draggedNoteId) return;
      e.preventDefault();
      btn.classList.remove('folder-drop-hover');
      const note = state.notes.find((n) => n.id === draggedNoteId);
      draggedNoteId = null;
      if (note && note.folderId !== f.id) {
        note.folderId = f.id;
        touchNote(note);
        renderAll();
        showToast(`'${f.name}' 폴더로 이동되었습니다.`);
      }
    });
    row.appendChild(btn);

    if (state.folders.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'folder-del-btn';
      delBtn.textContent = '×';
      delBtn.title = '폴더 삭제';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`'${f.name}' 폴더를 삭제하시겠습니까? (안의 노트는 삭제되지 않고 기본 폴더로 이동됩니다.)`)) return;
        const fallbackFolder = state.folders.find((fl) => fl.id !== f.id);
        state.notes.forEach((n) => {
          if (n.folderId === f.id && fallbackFolder) n.folderId = fallbackFolder.id;
        });
        state.folders = state.folders.filter((fl) => fl.id !== f.id);
        if (activeNav === `folder:${f.id}`) activeNav = 'all';
        scheduleSave();
        renderAll();
      });
      row.appendChild(delBtn);
    }

    folderListEl.appendChild(row);
  }

  // Folder selects in editor & clipper
  const folderSelects = [
    document.getElementById('note-folder-select'),
    document.getElementById('clipper-target-folder')
  ];
  for (const sel of folderSelects) {
    if (!sel) continue;
    const prev = sel.value;
    sel.innerHTML = state.folders.map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
    if (prev && state.folders.some((f) => f.id === prev)) sel.value = prev;
  }

  // Tags (Smart Tag Management: Popular Top 15 + Lazy On-Demand Rendering)
  const tagCounts = new Map();
  for (const n of activeNotes) {
    for (const t of n.tags || []) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }
  const tagsSection = document.getElementById('sidebar-tags-section');
  const tagListEl = document.getElementById('tag-list');
  tagListEl.innerHTML = '';
  if (tagCounts.size === 0) {
    tagsSection.classList.add('hidden');
  } else {
    tagsSection.classList.remove('hidden');

    // 사용 빈도 최다순(내림차순) 정렬, 동률이면 가나다순
    const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'ko');
    });

    const SIDEBAR_TAG_LIMIT = 15;
    const shouldLimit = sortedTags.length > SIDEBAR_TAG_LIMIT && !isSidebarTagsExpanded;
    // 평소에는 15개만 DOM 생성(부하 0%), 사용자가 [더보기]를 누른 순간에만 전체 DOM 지연 생성
    const tagsToRender = shouldLimit ? sortedTags.slice(0, SIDEBAR_TAG_LIMIT) : sortedTags;

    tagListEl.classList.toggle('expanded', isSidebarTagsExpanded && sortedTags.length > SIDEBAR_TAG_LIMIT);

    for (const [tag, cnt] of tagsToRender) {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `tag-pill ${activeNav === `tag:${tag}` ? 'active' : ''}`;
      pill.textContent = `#${tag} (${cnt})`;
      pill.addEventListener('click', () => {
        selectCategoryNav(`tag:${tag}`);
      });
      tagListEl.appendChild(pill);
    }

    // 15개 초과 시 [+더보기] / [-접기] 지연 토글 버튼
    if (sortedTags.length > SIDEBAR_TAG_LIMIT) {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'tag-expand-btn';
      if (!isSidebarTagsExpanded) {
        toggleBtn.textContent = `＋${sortedTags.length - SIDEBAR_TAG_LIMIT}개 더보기`;
        toggleBtn.title = `숨겨진 ${sortedTags.length - SIDEBAR_TAG_LIMIT}개 태그 모두 펼치기`;
      } else {
        toggleBtn.textContent = '− 접기';
        toggleBtn.title = '인기 태그 15개만 보기';
      }
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isSidebarTagsExpanded = !isSidebarTagsExpanded;
        renderSidebar();
      });
      tagListEl.appendChild(toggleBtn);
    }
  }

  // Highlight active nav item
  document.querySelectorAll('.nav-group .nav-item[data-nav]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === activeNav);
  });

  // Render Quick Notes in Sidebar
  const quickContainer = document.getElementById('sidebar-quick-notes');
  if (quickContainer) {
    quickContainer.innerHTML = '';
    const notes = getFilteredNotes();
    if (notes.length === 0) {
      quickContainer.innerHTML = `<div class="text-muted" style="padding:6px 10px;font-size:12px;">노트 없음</div>`;
    } else {
      for (const note of notes.slice(0, 25)) {
        const row = document.createElement('div');
        row.className = `note-list-row ${note.id === activeNoteId && activeViewMode === 'editor' ? 'active' : ''}`;
        row.dataset.quickNoteId = note.id;
        const prefix = note.isEncrypted ? '[잠금] ' : note.favorite ? '★ ' : '';
        const query = (document.getElementById('list-view-search')?.value || document.getElementById('inline-filter-input')?.value || '').trim();
        const highlightedTitle = highlightSearchTerm(prefix + (note.title || '제목 없음'), query);
        row.innerHTML = `
          <span class="drag-handle" title="마우스로 잡아 순서 이동">⋮⋮</span>
          <span class="note-list-row-title">${highlightedTitle}</span>
        `;
        if (!note.trashed) {
          attachNoteRowDragEvents(row, note.id);
        }
        row.addEventListener('click', (e) => {
          if (e.target.closest('.drag-handle')) return;
          openNoteInEditor(note.id);
        });
        quickContainer.appendChild(row);
      }
    }
  }
}

/**
 * When clicking a category in the left sidebar (전체 노트, 중요 노트, 폴더, 태그, 휴지통),
 * switch to the Note List View so the user immediately sees the full list of notes!
 */
function selectCategoryNav(navKey) {
  activeNav = navKey;
  if (navKey === 'graph' && activeNoteId) {
    graphCenterNoteId = activeNoteId;
  }
  if (navKey === 'vault' || navKey === 'graph' || navKey === 'clipper') {
    renderAll();
  } else {
    activeViewMode = 'list';
    renderAll();
  }
  if (window.innerWidth <= 820) {
    closeSidebar();
  }
  pullLiveSyncStateIfNewer(false);
}

let pendingEditorSearchHighlight = '';

function clearSearchHighlights() {
  pendingEditorSearchHighlight = '';

  // Title preview -> input
  const titlePreview = document.getElementById('note-title-preview');
  const titleInput = document.getElementById('note-title-input');
  if (titlePreview && !titlePreview.classList.contains('hidden')) {
    titlePreview.classList.add('hidden');
    if (titleInput) {
      titleInput.classList.remove('hidden');
    }
  }

  // Body blocks
  document.querySelectorAll('.block-row').forEach((row) => {
    row.classList.remove('search-match-block');
    const preview = row.querySelector('.block-preview-overlay');
    const ta = row.querySelector('textarea.block-editable');
    if (preview && ta) {
      const stillHasFormatting = /(\*\*|\*|~~|==|<span\s+style=|\[\[)/.test(ta.value || '');
      if (stillHasFormatting) {
        preview.innerHTML = renderMarkdownInlineHtml(ta.value || '');
      } else if (document.activeElement !== ta) {
        preview.classList.add('hidden');
        ta.classList.remove('hidden');
      }
    }
  });
}

function applyEditorSearchHighlight(query) {
  if (!query) return;
  const q = query.trim();
  const qLower = q.toLowerCase();
  if (!qLower) return;
  pendingEditorSearchHighlight = q;

  const note = getActiveNote();
  if (!note) return;

  let firstMatchEl = null;

  // 1. 제목 일치 확인 및 인라인 검색어 음영 적용
  const titlePreview = document.getElementById('note-title-preview');
  const titleInput = document.getElementById('note-title-input');
  if ((note.title || '').toLowerCase().includes(qLower)) {
    if (titlePreview && titleInput) {
      titlePreview.innerHTML = highlightSearchTerm(note.title || '제목 없음', q);
      titlePreview.classList.remove('hidden');
      titleInput.classList.add('hidden');
      if (!firstMatchEl) firstMatchEl = titlePreview;
    }
  } else if (titlePreview && titleInput) {
    titlePreview.classList.add('hidden');
    titleInput.classList.remove('hidden');
  }

  // 2. 본문 블록 전체 일치 확인 및 인라인 검색어 음영 적용
  const blocks = getEditableBlocksForNote(note) || [];
  for (const b of blocks) {
    const isTextMatch = (b.text || '').toLowerCase().includes(qLower) || (b.details || '').toLowerCase().includes(qLower);
    const isOcrMatch = b.type === 'image' && b.ocrText && b.ocrText.toLowerCase().includes(qLower);
    if (isTextMatch || isOcrMatch) {
      const row = document.querySelector(`.block-row[data-block-id="${b.id}"]`);
      if (row) {
        const preview = row.querySelector('.block-preview-overlay');
        const ta = row.querySelector('textarea.block-editable');
        if (preview && ta) {
          let renderedHtml = renderMarkdownInlineHtml(ta.value || b.text || '');
          preview.innerHTML = highlightHtmlText(renderedHtml, q);
          preview.classList.remove('hidden');
          ta.classList.add('hidden');
          if (!firstMatchEl) {
            firstMatchEl = preview.querySelector('mark.search-highlight') || row;
          }
        } else if (!firstMatchEl) {
          firstMatchEl = row;
        }
      }
    }
  }

  // 첫 번째 일치 위치로 부드럽게 스크롤
  if (firstMatchEl) {
    setTimeout(() => {
      firstMatchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 90);
  }
}

function openNoteInEditor(noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || (note.trashed && activeNav !== 'trash')) {
    showToast('삭제되었거나 존재하지 않는 메모입니다.');
    const remaining = getFilteredNotes();
    activeNoteId = remaining[0]?.id || null;
    activeViewMode = 'list';
    renderAll(false, true);
    return;
  }
  clearBlockSelection();
  clearSearchHighlights();
  activeNoteId = noteId;
  if (['vault', 'graph', 'clipper'].includes(activeNav)) {
    activeNav = 'all';
  }
  activeViewMode = 'editor';

  // 잔류 포커스 및 텍스트 선택 영역 완벽 리셋
  const titleInput = document.getElementById('note-title-input');
  if (titleInput) {
    if (document.activeElement === titleInput) titleInput.blur();
    if (titleInput.setSelectionRange) {
      try { titleInput.setSelectionRange(0, 0); } catch (_) {}
    }
  }

  // 검색창에 검색어가 있었다면 기억해 두었다가 본문 진입 시 강조 및 자동 스크롤
  const query = (document.getElementById('list-view-search')?.value || document.getElementById('inline-filter-input')?.value || '').trim();
  pendingEditorSearchHighlight = query;

  renderAll();
  if (window.innerWidth <= 820) {
    closeSidebar();
  }

  if (pendingEditorSearchHighlight) {
    applyEditorSearchHighlight(pendingEditorSearchHighlight);
  }
  pullLiveSyncStateIfNewer(false);
}

// ============================================================================
// Rendering Main Note List View (#workspace-list-view)
// ============================================================================
const MAIN_LIST_PAGE_SIZE = 40;
let mainListViewRenderedCount = 0;
let mainListObserver = null;
let mainListScrollHandler = null;

function createMainNoteItemElement(note, folderMap, query, isTrash) {
  const item = document.createElement('div');
  item.className = `main-note-item ${note.id === activeNoteId ? 'active' : ''}`;
  item.dataset.noteId = note.id;
  const folderName = folderMap.get(note.folderId) || '기본';
  const tagsText = (note.tags || []).map((t) => `#${escapeHtml(t)}`).join(' ');
  const prefix = note.isEncrypted ? '[암호화] ' : note.favorite ? '★ ' : '';

  const highlightedTitle = highlightSearchTerm(prefix + (note.title || '제목 없음'), query);
  const highlightedSnippet = highlightSearchTerm(getNotePlainSnippet(note, query), query);

  item.innerHTML = `
    ${!isTrash ? `<span class="drag-handle" title="마우스로 잡고 위아래로 끌어 순서 변경 (또는 좌측 폴더로 이동)">⋮⋮</span>` : ''}
    <div class="main-note-left">
      <div class="main-note-title">${highlightedTitle}</div>
      <div class="main-note-snippet">${highlightedSnippet}</div>
    </div>
    <div class="main-note-right">
      ${tagsText ? `<span class="main-note-tags" title="${escapeHtml(tagsText)}">${tagsText}</span>` : ''}
      <span class="note-folder-badge">${escapeHtml(folderName)}</span>
      <span class="note-date-badge">${formatDate(note.updatedAt)}</span>
      ${
        isTrash
          ? `<button type="button" class="btn btn-secondary btn-sm btn-row-restore">복원</button>
             <button type="button" class="btn btn-danger btn-sm btn-row-del">영구 삭제</button>`
          : `<button type="button" class="text-btn text-danger btn-row-trash" title="휴지통으로 이동">삭제</button>`
      }
    </div>
  `;

  if (!isTrash) {
    attachNoteRowDragEvents(item, note.id);
  }

  item.querySelector('.btn-row-restore')?.addEventListener('click', (e) => {
    e.stopPropagation();
    lastLocalMutationTime = Date.now();
    note.trashed = false;
    note.updatedAt = new Date().toISOString();
    scheduleSave(true, true);
    renderAll();
    showToast('노트가 복원되었습니다.');
  });

  item.querySelector('.btn-row-del')?.addEventListener('click', (e) => {
    e.stopPropagation();
    lastLocalMutationTime = Date.now();
    state.notes = state.notes.filter((n) => n.id !== note.id);
    if (activeNoteId === note.id) {
      const remaining = getFilteredNotes();
      activeNoteId = remaining[0]?.id || null;
      activeViewMode = 'list';
      scheduleSave(true, true);
      renderAll(false, true);
    } else {
      scheduleSave(true, true);
      renderAll();
    }
    showToast('영구 삭제되었습니다.');
  });

  item.querySelector('.btn-row-trash')?.addEventListener('click', (e) => {
    e.stopPropagation();
    lastLocalMutationTime = Date.now();
    note.trashed = true;
    note.updatedAt = new Date().toISOString();
    lastTrashedNoteIds.push(note.id);
    if (activeNoteId === note.id) {
      const remaining = getFilteredNotes();
      activeNoteId = remaining[0]?.id || null;
      activeViewMode = 'list';
      scheduleSave(true, true);
      renderAll(false, true);
    } else {
      scheduleSave(true, true);
      renderAll();
    }
    showToast('휴지통으로 이동되었습니다.', 5000, '↩ 되돌리기', () => {
      undoLastNoteTrash();
    });
  });

  item.addEventListener('click', (e) => {
    if (e.target.closest('.drag-handle')) return;
    openNoteInEditor(note.id);
  });

  return item;
}

function renderMainNoteListView() {
  const titleEl = document.getElementById('current-filter-title');
  const subtitleEl = document.getElementById('current-filter-subtitle');
  const emptyTrashBtn = document.getElementById('btn-empty-trash');
  const quickUrlBar = document.getElementById('list-quick-url-bar');
  const container = document.getElementById('note-items-container');
  const scrollContainer = document.getElementById('workspace-list-view');

  hideMobileAccessoryBar();
  const navTitle = getCurrentNavTitle();
  const notes = getFilteredNotes();

  if (titleEl) titleEl.textContent = `${navTitle} (${notes.length})`;
  const breadcrumbEl = document.getElementById('active-note-breadcrumb');
  if (breadcrumbEl) breadcrumbEl.textContent = `${navTitle} 목록`;

  const isTrash = activeNav === 'trash';
  if (emptyTrashBtn) emptyTrashBtn.classList.toggle('hidden', !isTrash || notes.length === 0);
  if (quickUrlBar) quickUrlBar.classList.toggle('hidden', isTrash);
  if (subtitleEl) {
    subtitleEl.textContent = isTrash
      ? '휴지통의 노트를 복원하거나 영구 삭제할 수 있습니다.'
      : '마우스로 끌어 순서를 바꾸거나, Ctrl+V로 웹 URL을 붙여넣어 요약 노트를 만드세요.';
  }

  if (mainListObserver) {
    mainListObserver.disconnect();
    mainListObserver = null;
  }
  if (mainListScrollHandler && scrollContainer) {
    scrollContainer.removeEventListener('scroll', mainListScrollHandler);
    mainListScrollHandler = null;
  }

  if (!container) return;
  container.innerHTML = '';

  if (notes.length === 0) {
    container.innerHTML = `
      <div style="padding:40px 20px;text-align:center;">
        <p class="text-muted mb-8">${isTrash ? '휴지통이 비어 있습니다.' : '이 분류에 해당하는 노트가 없습니다.'}</p>
        ${!isTrash ? `<button type="button" id="btn-list-empty-new" class="btn btn-primary btn-sm">＋ 새 노트 작성</button>` : ''}
      </div>
    `;
    document.getElementById('btn-list-empty-new')?.addEventListener('click', () => createNewNote());
    return;
  }

  const folderMap = new Map(state.folders.map((f) => [f.id, f.name]));
  const query = (document.getElementById('list-view-search')?.value || document.getElementById('inline-filter-input')?.value || '').trim();
  mainListViewRenderedCount = 0;

  function loadNextBatch() {
    const sentinel = document.getElementById('main-list-sentinel');
    if (sentinel) sentinel.remove();

    const start = mainListViewRenderedCount;
    const end = Math.min(notes.length, start + MAIN_LIST_PAGE_SIZE);
    const fragment = document.createDocumentFragment();

    for (let i = start; i < end; i++) {
      fragment.appendChild(createMainNoteItemElement(notes[i], folderMap, query, isTrash));
    }
    container.appendChild(fragment);
    mainListViewRenderedCount = end;

    if (mainListViewRenderedCount < notes.length) {
      const nextSentinel = document.createElement('div');
      nextSentinel.id = 'main-list-sentinel';
      nextSentinel.className = 'main-list-sentinel';
      nextSentinel.innerHTML = `
        <div class="main-list-more-wrap">
          <span class="text-muted" style="font-size:12px;">스크롤을 내리면 추가로 표시됩니다 (${mainListViewRenderedCount} / ${notes.length})</span>
          <button type="button" class="btn btn-secondary btn-xs btn-load-more-manual" style="margin-left:8px;padding:3px 8px;font-size:11px;">더 불러오기</button>
        </div>
      `;
      nextSentinel.querySelector('.btn-load-more-manual')?.addEventListener('click', (e) => {
        e.stopPropagation();
        loadNextBatch();
      });
      container.appendChild(nextSentinel);

      if ('IntersectionObserver' in window && scrollContainer) {
        if (!mainListObserver) {
          mainListObserver = new IntersectionObserver(
            (entries) => {
              if (entries[0] && entries[0].isIntersecting) {
                loadNextBatch();
              }
            },
            {
              root: scrollContainer,
              rootMargin: '250px',
              threshold: 0.01,
            }
          );
        }
        mainListObserver.observe(nextSentinel);
      }

      if (!mainListScrollHandler && scrollContainer) {
        mainListScrollHandler = () => {
          if (mainListViewRenderedCount >= notes.length) return;
          if (scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 350) {
            loadNextBatch();
          }
        };
        scrollContainer.addEventListener('scroll', mainListScrollHandler, { passive: true });
      }
    } else {
      if (mainListObserver) {
        mainListObserver.disconnect();
        mainListObserver = null;
      }
      if (mainListScrollHandler && scrollContainer) {
        scrollContainer.removeEventListener('scroll', mainListScrollHandler);
        mainListScrollHandler = null;
      }
      if (notes.length > MAIN_LIST_PAGE_SIZE) {
        const endNotice = document.createElement('div');
        endNotice.className = 'main-list-end-notice';
        endNotice.style.cssText = 'padding:14px;text-align:center;font-size:12px;color:var(--text-muted);border-top:1px dashed var(--border);';
        endNotice.textContent = `모든 노트 (${notes.length}개)를 다 불러왔습니다.`;
        container.appendChild(endNotice);
      }
    }
  }

  loadNextBatch();
}

// ============================================================================
// Rendering Active Note & Minimalist Block Editor
// ============================================================================
function getActiveNote() {
  return state.notes.find((n) => n.id === activeNoteId) || null;
}

function getEditableBlocksForNote(note) {
  if (!note) return [];
  if (!note.isEncrypted) return note.blocks || [];
  return decryptedNotesSessionMap.get(note.id) || null;
}

function closeTagPopover() {
  const pop = document.getElementById('note-tag-popover');
  if (pop) pop.classList.add('hidden');
}

function commitPopoverTags() {
  const inp = document.getElementById('note-tag-popover-input');
  const raw = (inp?.value || '').trim();
  const note = getActiveNote();
  if (!raw || !note) {
    closeTagPopover();
    return;
  }
  const tokens = raw
    .split(/[,]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean);

  if (tokens.length > 0) {
    note.tags = note.tags || [];
    for (const tag of tokens) {
      if (!note.tags.includes(tag)) note.tags.push(tag);
    }
    touchNote(note);
    if (inp) inp.value = '';
    closeTagPopover();
    renderAll();
  } else {
    closeTagPopover();
  }
}

function renderActiveNoteEditor() {
  const note = getActiveNote();
  const encryptedGate = document.getElementById('note-encrypted-gate');
  const emptyState = document.getElementById('note-empty-state');
  const editorContent = document.getElementById('note-editor-content');

  if (!note) {
    clearBlockSelection();
    encryptedGate.classList.add('hidden');
    editorContent.classList.add('hidden');
    emptyState.classList.remove('hidden');
    document.getElementById('active-note-breadcrumb').textContent = getCurrentNavTitle();
    return;
  }

  emptyState.classList.add('hidden');

  const folder = state.folders.find((f) => f.id === note.folderId);
  document.getElementById('active-note-breadcrumb').textContent =
    `${folder ? folder.name : '노트'} / ${note.title || '제목 없음'}`;

  const blocks = getEditableBlocksForNote(note);
  if (note.isEncrypted && !blocks) {
    encryptedGate.classList.remove('hidden');
    editorContent.classList.add('hidden');
    document.getElementById('note-cipher-preview').textContent =
      JSON.stringify(note.encryptedPayload, null, 2);
    return;
  }

  encryptedGate.classList.add('hidden');
  editorContent.classList.remove('hidden');

  let trashBanner = document.getElementById('editor-trash-banner');
  if (!trashBanner) {
    trashBanner = document.createElement('div');
    trashBanner.id = 'editor-trash-banner';
    trashBanner.style.cssText = 'padding:10px 14px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);border-radius:8px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;color:var(--text-primary);font-size:13px;';
    editorContent.insertBefore(trashBanner, editorContent.firstChild);
  }
  trashBanner.classList.toggle('hidden', !note.trashed);
  if (note.trashed) {
    trashBanner.innerHTML = `
      <span>🗑️ <strong>휴지통에 있는 메모입니다.</strong> (읽기 전용 모드)</span>
      <span style="font-size:12px;color:var(--text-muted);">편집하거나 동기화하려면 상단의 [복원] 버튼을 누르세요.</span>
    `;
  }

  initNoteUndoHistory(note);

  const titlePreview = document.getElementById('note-title-preview');
  const titleInput = document.getElementById('note-title-input');
  titleInput.readOnly = Boolean(note.trashed);
  if (document.activeElement !== titleInput) {
    titleInput.value = note.title || '';
  }
  if (!pendingEditorSearchHighlight || !(note.title || '').toLowerCase().includes(pendingEditorSearchHighlight.toLowerCase())) {
    if (titlePreview) titlePreview.classList.add('hidden');
    if (titleInput) titleInput.classList.remove('hidden');
  }
  setTimeout(() => autoResizeTextarea(titleInput), 0);

  const favBtn = document.getElementById('btn-toggle-fav');
  favBtn.textContent = note.favorite ? '★ 중요' : '☆ 중요';
  favBtn.classList.toggle('active', Boolean(note.favorite));
  favBtn.disabled = Boolean(note.trashed);

  const encBtn = document.getElementById('btn-toggle-note-encrypt');
  encBtn.textContent = note.isEncrypted ? '암호화 해제' : '암호화 잠금';
  encBtn.classList.toggle('active', Boolean(note.isEncrypted));
  encBtn.disabled = Boolean(note.trashed);

  const relockBtn = document.getElementById('btn-relock-note');
  if (relockBtn) {
    relockBtn.classList.toggle('hidden', !note.isEncrypted || note.trashed);
  }

  const restoreBtn = document.getElementById('btn-restore-note');
  const delBtn = document.getElementById('btn-delete-note');
  restoreBtn.classList.toggle('hidden', !note.trashed);
  delBtn.textContent = note.trashed ? '영구 삭제' : '삭제';

  const folderSel = document.getElementById('note-folder-select');
  if (folderSel) {
    folderSel.value = note.folderId || (state.folders[0]?.id || '');
    folderSel.disabled = Boolean(note.trashed);
  }
  const statusSel = document.getElementById('note-status-select');
  if (statusSel) {
    statusSel.value = note.status || '';
    statusSel.disabled = Boolean(note.trashed);
  }
  const tagAddBtn = document.getElementById('btn-open-tag-popover');
  if (tagAddBtn) tagAddBtn.disabled = Boolean(note.trashed);
  closeTagPopover();

  // Created & Updated timestamps display
  const datesEl = document.getElementById('note-dates-display');
  if (datesEl) {
    const createdStr = formatDate(note.createdAt);
    const updatedStr = formatDate(note.updatedAt);
    if (createdStr && updatedStr && createdStr !== updatedStr) {
      datesEl.textContent = `저장 ${createdStr} · 수정 ${updatedStr}`;
      datesEl.title = `최초 저장: ${createdStr}\n최종 수정: ${updatedStr}`;
    } else if (createdStr || updatedStr) {
      datesEl.textContent = `저장 ${createdStr || updatedStr}`;
      datesEl.title = `저장 시각: ${createdStr || updatedStr}`;
    } else {
      datesEl.textContent = '';
    }
  }

  // Tags
  const tagsWrap = document.getElementById('note-tags-container');
  tagsWrap.innerHTML = '';
  for (const tag of note.tags || []) {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `#${escapeHtml(tag)} ${note.trashed ? '' : '<button type="button" title="태그 삭제">×</button>'}`;
    if (!note.trashed) {
      chip.querySelector('button')?.addEventListener('click', () => {
        note.tags = (note.tags || []).filter((t) => t !== tag);
        touchNote(note);
        renderAll();
      });
    }
    tagsWrap.appendChild(chip);
  }

  renderBlocksList(note, blocks);

  if (note.trashed) {
    const blocksContainer = document.getElementById('blocks-container');
    if (blocksContainer) {
      blocksContainer.querySelectorAll('input, textarea').forEach((el) => {
        el.readOnly = true;
      });
      blocksContainer.querySelectorAll('.block-gutter, .img-quick-toolbar, .block-plus-btn, .block-drag-btn, .text-btn').forEach((el) => {
        el.style.display = 'none';
      });
    }
  }

  hideMobileAccessoryBar();
  renderBacklinksPanel(note, blocks);
}

// ============================================================================
// Multi-Block Selection & Batch Deletion Engine (Notion / Obsidian style)
// ============================================================================
function clearBlockSelection() {
  selectedBlockIds.clear();
  lastSelectedBlockId = null;
  document.getElementById('multi-turninto-menu')?.classList.add('hidden');
  document.querySelectorAll('#blocks-container .block-row.selected-block-row').forEach((el) => {
    el.classList.remove('selected-block-row');
  });
  updateMultiBlockActionBar();
}

function getBlockTypeLabel(type) {
  const map = {
    p: '본문',
    h1: '제목 1',
    h2: '제목 2',
    h3: '제목 3',
    todo: '할 일 체크리스트',
    bullet: '글머리 목록',
    number: '번호 목록',
    toggle: '토글 목록',
    callout: '인용/콜아웃',
    code: '코드 블록',
    table: '표'
  };
  return map[type] || type;
}

function applyBlockTypeToSelectedBlocks(newType) {
  if (selectedBlockIds.size === 0) return;
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  recordPreActionSnapshot();

  let count = 0;
  for (const block of blocks) {
    if (selectedBlockIds.has(block.id)) {
      block.type = newType;
      if (newType === 'todo' && block.checked === undefined) {
        block.checked = false;
      }
      if (newType === 'table' && !block.rows) {
        block.rows = [
          ['항목', '내용', '비고'],
          ['', '', '']
        ];
      }
      count++;
    }
  }

  touchNote(note, blocks);
  renderActiveNoteEditor();
  showToast(`${count}개 블록이 '${getBlockTypeLabel(newType)}'(으)로 일괄 변환되었습니다.`);
  document.getElementById('multi-turninto-menu')?.classList.add('hidden');
  updateMultiBlockActionBar();
}

function updateMultiBlockActionBar() {
  const bar = document.getElementById('multi-block-action-bar');
  const countEl = document.getElementById('multi-block-count');
  if (!bar) return;
  const count = selectedBlockIds.size;
  if (count > 0) {
    if (countEl) countEl.textContent = `${count}개 줄 선택됨`;
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

function toggleBlockSelection(blockId, isShift = false) {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  if (isShift && lastSelectedBlockId) {
    const idx1 = blocks.findIndex((b) => b.id === lastSelectedBlockId);
    const idx2 = blocks.findIndex((b) => b.id === blockId);
    if (idx1 !== -1 && idx2 !== -1) {
      const start = Math.min(idx1, idx2);
      const end = Math.max(idx1, idx2);
      for (let i = start; i <= end; i++) {
        selectedBlockIds.add(blocks[i].id);
      }
    } else {
      selectedBlockIds.add(blockId);
      lastSelectedBlockId = blockId;
    }
  } else {
    if (selectedBlockIds.has(blockId)) {
      selectedBlockIds.delete(blockId);
      if (lastSelectedBlockId === blockId) {
        lastSelectedBlockId = selectedBlockIds.size > 0 ? Array.from(selectedBlockIds)[selectedBlockIds.size - 1] : null;
      }
    } else {
      selectedBlockIds.add(blockId);
      lastSelectedBlockId = blockId;
    }
  }

  document.querySelectorAll('#blocks-container .block-row').forEach((row) => {
    const bId = row.dataset.blockId;
    row.classList.toggle('selected-block-row', selectedBlockIds.has(bId));
  });

  updateMultiBlockActionBar();
}

function selectAllBlocks() {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks || blocks.length === 0) return;
  selectedBlockIds.clear();
  blocks.forEach((b) => selectedBlockIds.add(b.id));
  lastSelectedBlockId = blocks[blocks.length - 1].id;
  document.querySelectorAll('#blocks-container .block-row').forEach((row) => {
    row.classList.add('selected-block-row');
  });
  updateMultiBlockActionBar();
}

function deleteSelectedBlocks() {
  if (selectedBlockIds.size === 0) return;
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  const count = selectedBlockIds.size;
  recordPreActionSnapshot();

  const remaining = blocks.filter((b) => !selectedBlockIds.has(b.id));
  if (remaining.length === 0) {
    remaining.push({ id: uid('b'), type: 'p', text: '' });
  }

  blocks.length = 0;
  blocks.push(...remaining);

  clearBlockSelection();
  touchNote(note, blocks);
  renderActiveNoteEditor();
  showToast(`${count}개 줄이 삭제되었습니다. (되돌리기: ↩ 또는 Ctrl+Z)`);
}

/**
 * 인라인 마크다운 서식 렌더러 (볼드, 기울임, 취소선, 형광펜, 글자색, 링크 등)
 */
function renderMarkdownInlineHtml(text = '') {
  if (!text) return '';
  let html = escapeHtml(text);
  // 글자 색상 태그 복원 (안전한 inline style 속성 허용)
  html = html.replace(/&lt;span style=&quot;color:\s*([^&"]+?);?&quot;&gt;([\s\S]*?)&lt;\/span&gt;/gi, '<span style="color:$1">$2</span>');
  // 글자 배경/형광펜 태그 (background-color)
  html = html.replace(/&lt;span style=&quot;background(?:-color)?:\s*([^&"]+?);?&quot;&gt;([\s\S]*?)&lt;\/span&gt;/gi, '<span style="background-color:$1">$2</span>');
  // 형광펜: ==text==
  html = html.replace(/==([^=\n]+)==/g, '<mark class="inline-highlight">$1</mark>');
  // 굵게: **text**
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // 취소선: ~~text~~
  html = html.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  // 기울임: *text*
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // 코드: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  // 위키링크: [[노트제목]]
  html = html.replace(/\[\[([^\]\n]+)\]\]/g, '<span class="wikilink-pill" data-wikitarget="$1">🔗 $1</span>');
  // 마크다운 링크: [표시텍스트](URL)
  html = html.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="external-link">$1 ↗</a>');
  // 일반 URL 자동 링크
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="external-link">$2 ↗</a>');
  return html;
}

let activeFormattedTextarea = null;
let selectionCheckTimer = null;

function repositionFloatingFormatToolbar() {
  const toolbar = document.getElementById('floating-format-toolbar');
  if (!toolbar) return;
  const ta = activeFormattedTextarea;
  if (!ta || !document.body.contains(ta)) {
    hideFloatingFormatToolbar();
    return;
  }

  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  if (typeof start !== 'number' || typeof end !== 'number' || start === end) {
    hideFloatingFormatToolbar();
    return;
  }

  const rect = ta.getBoundingClientRect();
  // If the block is scrolled completely off-screen, hide temporarily
  if (rect.bottom < 50 || rect.top > window.innerHeight - 20) {
    toolbar.classList.add('hidden');
    return;
  }

  toolbar.classList.remove('hidden');

  const tbWidth = toolbar.offsetWidth || 260;
  const tbHeight = toolbar.offsetHeight || 38;

  // 스마트폰 기본 시스템 메뉴(복사/붙여넣기 띠)가 글자 '위쪽'에 뜨므로,
  // 양식띠는 어떤 상황에서도 절대 글자 위로 올라가지 않고 항상 글자 '아래쪽'에 표시:
  let top = rect.bottom + 8;

  // 가상 키보드 및 화면 하단 뷰포트 경계 처리:
  const vpHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const maxAllowedTop = vpHeight - tbHeight - 8;

  if (top > maxAllowedTop) {
    // 선택된 글자가 가상 키보드에 붙어 아래 공간이 부족한 경우 화면을 살짝 밀어 공간 확보
    const neededScroll = Math.ceil(top - maxAllowedTop);
    if (neededScroll > 0 && neededScroll < 220) {
      const scrollContainer = document.getElementById('primary-editor-pane') || window;
      scrollContainer.scrollBy?.({ top: neededScroll + 16, behavior: 'smooth' });
    }
    // 절대 글자 위(rect.top)로는 올라가지 않도록 하한선 고정
    top = Math.max(rect.bottom + 4, maxAllowedTop);
  }

  // Safe horizontal positioning (centered on block, within screen bounds)
  let left = rect.left + rect.width / 2;
  left = Math.max(tbWidth / 2 + 10, Math.min(window.innerWidth - tbWidth / 2 - 10, left));

  toolbar.style.top = `${Math.round(top)}px`;
  toolbar.style.left = `${Math.round(left)}px`;
}

function handleBlockTextSelection(ta) {
  if (!ta) {
    hideFloatingFormatToolbar();
    return;
  }
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  if (typeof start !== 'number' || typeof end !== 'number' || start === end) {
    hideFloatingFormatToolbar();
    return;
  }

  activeFormattedTextarea = ta;
  repositionFloatingFormatToolbar();
}

// Global selectionchange listener: triggers formatting bar ONLY when a text range is actively selected
document.addEventListener('selectionchange', () => {
  clearTimeout(selectionCheckTimer);
  selectionCheckTimer = setTimeout(() => {
    const activeEl = document.activeElement;
    if (activeEl && activeEl.classList?.contains('block-editable')) {
      handleBlockTextSelection(activeEl);
    } else if (activeFormattedTextarea && document.body.contains(activeFormattedTextarea)) {
      // Check if the previous textarea still has an active text range selection (e.g. during scroll or touch)
      const start = activeFormattedTextarea.selectionStart;
      const end = activeFormattedTextarea.selectionEnd;
      if (typeof start === 'number' && typeof end === 'number' && start !== end) {
        repositionFloatingFormatToolbar();
        return;
      }
      hideFloatingFormatToolbar();
    } else if (!activeEl || !activeEl.closest?.('#floating-format-toolbar')) {
      hideFloatingFormatToolbar();
    }
  }, 60);
});

function updateMobileAccessoryBarPosition() {}
function showMobileAccessoryBar() {}
function hideMobileAccessoryBar() {
  const bar = document.getElementById('mobile-format-accessory-bar');
  if (bar) bar.classList.add('hidden');
}

function indentActiveBlock(delta) {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  let activeRow = document.activeElement?.closest?.('.block-row');
  if (!activeRow && activeFormattedTextarea) {
    activeRow = activeFormattedTextarea.closest?.('.block-row');
  }
  if (!activeRow) {
    activeRow = document.querySelector('.block-row');
  }
  const blockId = activeRow?.dataset?.blockId;
  if (!blockId) return;

  const block = blocks.find((b) => b.id === blockId);
  if (!block) return;

  recordPreActionSnapshot();
  if (delta > 0) {
    block.indent = Math.min((block.indent || 0) + 1, 4);
  } else {
    block.indent = Math.max((block.indent || 0) - 1, 0);
  }
  touchNote(note, blocks);
  renderActiveNoteEditor();
  focusBlock(block.id);
}

function hideFloatingFormatToolbar() {
  const toolbar = document.getElementById('floating-format-toolbar');
  if (toolbar) toolbar.classList.add('hidden');
  document.getElementById('format-color-palette')?.classList.add('hidden');
}

function applyFormattingToActiveSelection(formatType, targetTa = null, customColor = '') {
  let ta = targetTa || activeFormattedTextarea;
  if (!ta) {
    const focused = document.activeElement;
    if (focused && focused.classList?.contains('block-editable')) {
      ta = focused;
    } else {
      ta = document.querySelector('.block-row textarea.block-editable:not(.hidden)') || document.querySelector('textarea.block-editable');
    }
  }
  if (!ta) return;

  const start = typeof ta.selectionStart === 'number' ? ta.selectionStart : ta.value.length;
  const end = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : ta.value.length;
  const val = ta.value || '';
  const selected = val.slice(start, end);
  let replacement = selected;
  let cursorOffset = 0;

  if (start === end) {
    // 선택 영역이 없을 때: 마크다운 기호를 감싸서 삽입하고 커서를 가운데로 이동
    if (formatType === 'bold') {
      replacement = '****';
      cursorOffset = 2;
    } else if (formatType === 'italic') {
      replacement = '**';
      cursorOffset = 1;
    } else if (formatType === 'strike') {
      replacement = '~~~~';
      cursorOffset = 2;
    } else if (formatType === 'mark') {
      replacement = '====';
      cursorOffset = 2;
    } else if (formatType === 'color' && customColor) {
      replacement = `<span style="color:${customColor}"></span>`;
      cursorOffset = `<span style="color:${customColor}">`.length;
    }
  } else {
    // 텍스트가 선택되어 있을 때: 감싸거나 토글
    if (formatType === 'bold') {
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
      } else {
        replacement = `**${selected}**`;
      }
    } else if (formatType === 'italic') {
      if (selected.startsWith('*') && selected.endsWith('*') && selected.length >= 2) {
        replacement = selected.slice(1, -1);
      } else {
        replacement = `*${selected}*`;
      }
    } else if (formatType === 'strike') {
      if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
      } else {
        replacement = `~~${selected}~~`;
      }
    } else if (formatType === 'mark') {
      if (selected.startsWith('==') && selected.endsWith('==') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
      } else {
        replacement = `==${selected}==`;
      }
    } else if (formatType === 'color') {
      if (customColor) {
        replacement = `<span style="color:${customColor}">${selected.replace(/<\/?span[^>]*>/gi, '')}</span>`;
      } else {
        replacement = selected.replace(/<\/?span[^>]*>/gi, '');
      }
    }
  }

  recordPreActionSnapshot();
  ta.value = val.slice(0, start) + replacement + val.slice(end);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.focus();
  try {
    if (start === end && cursorOffset > 0) {
      ta.setSelectionRange(start + cursorOffset, start + cursorOffset);
    } else {
      ta.setSelectionRange(start, start + replacement.length);
    }
  } catch (_) {}

  hideFloatingFormatToolbar();
  hideMobileAccessoryBar();
  document.getElementById('mobile-format-color-palette')?.classList.add('hidden');
}

function renderBlocksList(note, blocks) {
  const container = document.getElementById('blocks-container');
  container.innerHTML = '';

  if (!blocks || blocks.length === 0) {
    blocks = [{ id: uid('b'), type: 'p', text: '' }];
    if (!note.isEncrypted) note.blocks = blocks;
  }

  const validIds = new Set(blocks.map((b) => b.id));
  for (const id of selectedBlockIds) {
    if (!validIds.has(id)) selectedBlockIds.delete(id);
  }
  updateMultiBlockActionBar();

  blocks.forEach((block, idx) => {
    const row = document.createElement('div');
    row.className = `block-row block-${block.type || 'p'}`;
    if (selectedBlockIds.has(block.id)) {
      row.classList.add('selected-block-row');
    }
    row.dataset.blockId = block.id;

    const gutter = document.createElement('div');
    gutter.className = 'block-gutter';

    const dragBtn = document.createElement('button');
    dragBtn.type = 'button';
    dragBtn.className = 'block-drag-btn';
    dragBtn.textContent = '⋮⋮';
    dragBtn.title = '클릭: 줄 선택 (Shift+클릭: 범위 선택) / 드래그: 순서 이동';
    dragBtn.addEventListener('mousedown', () => {
      row.draggable = true;
    });
    dragBtn.addEventListener('mouseup', () => {
      row.draggable = false;
    });
    dragBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBlockSelection(block.id, e.shiftKey);
    });

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'block-plus-btn';
    plusBtn.textContent = '+';
    plusBtn.title = '블록 전환 / 이동 / 삭제 (/)';
    plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSlashMenu(block.id, e.currentTarget.getBoundingClientRect());
    });
    gutter.appendChild(dragBtn);
    gutter.appendChild(plusBtn);

    gutter.addEventListener('click', (e) => {
      if (e.target.closest('.block-plus-btn')) return;
      e.stopPropagation();
      toggleBlockSelection(block.id, e.shiftKey);
    });

    // 1. PC 마우스 드래그 앤 드롭 (단일 블록 및 다중 선택 블록 일괄 이동)
    row.addEventListener('dragstart', (e) => {
      draggedBlockId = block.id;
      const isMulti = selectedBlockIds.has(block.id);
      if (isMulti) {
        container.querySelectorAll('.selected-block-row').forEach((r) => r.classList.add('dragging'));
      } else {
        row.classList.add('dragging');
      }
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', block.id);
      }
    });
    row.addEventListener('dragend', () => {
      draggedBlockId = null;
      row.draggable = false;
      container.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
      container.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach((n) => {
        n.classList.remove('drop-target-top', 'drop-target-bottom');
      });
    });
    row.addEventListener('dragover', (e) => {
      if (!draggedBlockId) return;
      const isMulti = selectedBlockIds.has(draggedBlockId);
      if (isMulti ? selectedBlockIds.has(block.id) : draggedBlockId === block.id) return;
      e.preventDefault();
      const rect = row.getBoundingClientRect();
      const isAfter = e.clientY > rect.top + rect.height / 2;
      row.classList.toggle('drop-target-top', !isAfter);
      row.classList.toggle('drop-target-bottom', isAfter);
    });
    row.addEventListener('dragleave', () => {
      row.classList.remove('drop-target-top', 'drop-target-bottom');
    });
    row.addEventListener('drop', (e) => {
      if (!draggedBlockId) return;
      const isMulti = selectedBlockIds.has(draggedBlockId);
      if (isMulti ? selectedBlockIds.has(block.id) : draggedBlockId === block.id) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = row.getBoundingClientRect();
      const isAfter = e.clientY > rect.top + rect.height / 2;
      row.classList.remove('drop-target-top', 'drop-target-bottom');

      recordPreActionSnapshot();

      if (isMulti) {
        // 다중 블록 묶음 일괄 이동 (원래 순서 보존)
        const movedBlocks = blocks.filter((b) => selectedBlockIds.has(b.id));
        const remainingBlocks = blocks.filter((b) => !selectedBlockIds.has(b.id));
        const targetIdx = remainingBlocks.findIndex((b) => b.id === block.id);
        if (targetIdx === -1) {
          remainingBlocks.push(...movedBlocks);
        } else {
          remainingBlocks.splice(isAfter ? targetIdx + 1 : targetIdx, 0, ...movedBlocks);
        }
        if (!note.isEncrypted) {
          note.blocks = remainingBlocks;
        } else {
          decryptedNotesSessionMap.set(note.id, remainingBlocks);
        }
        touchNote(note, remainingBlocks);
        renderActiveNoteEditor();
        showToast(`${movedBlocks.length}개 블록이 함께 이동되었습니다.`);
      } else {
        // 단일 블록 이동
        const fromIndex = blocks.findIndex((b) => b.id === draggedBlockId);
        if (fromIndex !== -1) {
          const [movedBlock] = blocks.splice(fromIndex, 1);
          const toIndex = blocks.findIndex((b) => b.id === block.id);
          if (toIndex === -1) {
            blocks.push(movedBlock);
          } else {
            blocks.splice(isAfter ? toIndex + 1 : toIndex, 0, movedBlock);
          }
          touchNote(note, blocks);
          renderActiveNoteEditor();
        }
      }
      draggedBlockId = null;
    });

    // 2. 스마트폰/터치스크린용 손가락 터치 블록 드래그 엔진
    let touchBlockMoved = false;
    let currentBlockDropTarget = null;
    let isBlockDropAfter = false;

    dragBtn.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      draggedBlockId = block.id;
      touchBlockMoved = false;
      const isMulti = selectedBlockIds.has(block.id);
      if (isMulti) {
        container.querySelectorAll('.selected-block-row').forEach((r) => r.classList.add('dragging'));
      } else {
        row.classList.add('dragging');
      }
      if (navigator.vibrate) {
        try { navigator.vibrate(20); } catch (_) {}
      }
    }, { passive: true });

    dragBtn.addEventListener('touchmove', (e) => {
      if (!draggedBlockId || draggedBlockId !== block.id) return;
      touchBlockMoved = true;
      if (e.cancelable) e.preventDefault();

      const touch = e.touches[0];
      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!elemBelow) return;

      const targetRow = elemBelow.closest('.block-row');
      container.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach((n) => {
        n.classList.remove('drop-target-top', 'drop-target-bottom');
      });

      const isMulti = selectedBlockIds.has(draggedBlockId);
      const targetBlockId = targetRow?.dataset?.blockId;

      if (targetRow && (isMulti ? !selectedBlockIds.has(targetBlockId) : targetRow !== row)) {
        currentBlockDropTarget = targetRow;
        const rect = targetRow.getBoundingClientRect();
        isBlockDropAfter = touch.clientY > rect.top + rect.height / 2;
        targetRow.classList.toggle('drop-target-top', !isBlockDropAfter);
        targetRow.classList.toggle('drop-target-bottom', isBlockDropAfter);
      } else {
        currentBlockDropTarget = null;
      }
    }, { passive: false });

    const finishBlockTouchDrag = (e) => {
      if (!draggedBlockId || draggedBlockId !== block.id) return;
      container.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
      container.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach((n) => {
        n.classList.remove('drop-target-top', 'drop-target-bottom');
      });

      if (touchBlockMoved && currentBlockDropTarget) {
        const targetBlockId = currentBlockDropTarget.dataset.blockId;
        const isMulti = selectedBlockIds.has(draggedBlockId);
        if (targetBlockId && (isMulti ? !selectedBlockIds.has(targetBlockId) : targetBlockId !== block.id)) {
          recordPreActionSnapshot();
          if (isMulti) {
            const movedBlocks = blocks.filter((b) => selectedBlockIds.has(b.id));
            const remainingBlocks = blocks.filter((b) => !selectedBlockIds.has(b.id));
            const targetIdx = remainingBlocks.findIndex((b) => b.id === targetBlockId);
            if (targetIdx === -1) {
              remainingBlocks.push(...movedBlocks);
            } else {
              remainingBlocks.splice(isBlockDropAfter ? targetIdx + 1 : targetIdx, 0, ...movedBlocks);
            }
            if (!note.isEncrypted) note.blocks = remainingBlocks;
            else decryptedNotesSessionMap.set(note.id, remainingBlocks);
            touchNote(note, remainingBlocks);
            renderActiveNoteEditor();
            showToast(`${movedBlocks.length}개 블록이 함께 이동되었습니다.`);
          } else {
            const fromIndex = blocks.findIndex((b) => b.id === draggedBlockId);
            if (fromIndex !== -1) {
              const [movedBlock] = blocks.splice(fromIndex, 1);
              const toIndex = blocks.findIndex((b) => b.id === targetBlockId);
              if (toIndex === -1) {
                blocks.push(movedBlock);
              } else {
                blocks.splice(isBlockDropAfter ? toIndex + 1 : toIndex, 0, movedBlock);
              }
              touchNote(note, blocks);
              renderActiveNoteEditor();
            }
          }
        }
      }
      draggedBlockId = null;
      currentBlockDropTarget = null;
      touchBlockMoved = false;
    };

    dragBtn.addEventListener('touchend', finishBlockTouchDrag);
    dragBtn.addEventListener('touchcancel', () => {
      container.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
      container.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach((n) => {
        n.classList.remove('drop-target-top', 'drop-target-bottom');
      });
      draggedBlockId = null;
      currentBlockDropTarget = null;
      touchBlockMoved = false;
    });

    const body = document.createElement('div');
    body.className = 'block-body';
    if (block.indent) {
      body.style.marginLeft = `${block.indent * 24}px`;
    }
    body.addEventListener('focusin', () => {
      if (selectedBlockIds.size > 0 && !selectedBlockIds.has(block.id)) {
        clearBlockSelection();
      }
    });

    if (block.type === 'divider') {
      const hrWrap = document.createElement('div');
      hrWrap.style.padding = '10px 0';
      hrWrap.style.cursor = 'pointer';
      hrWrap.title = '클릭하여 구분선 삭제';
      hrWrap.innerHTML = `<hr style="border:none;border-top:1px solid var(--border-strong);" />`;
      hrWrap.addEventListener('click', () => {
        if (blocks.length > 1) {
          blocks.splice(idx, 1);
          touchNote(note, blocks);
          renderActiveNoteEditor();
        }
      });
      body.appendChild(hrWrap);
    } else if (block.type === 'image') {
      body.className += ' block-image';
      const initialWidthStyle = block.width ? `width:${block.width};` : '';
      const hasOcr = Boolean((block.ocrText || '').trim());
      body.innerHTML = `
        <div class="image-resizer-box" style="${initialWidthStyle}">
          <div class="img-quick-toolbar">
            <span class="img-size-badge">${escapeHtml(block.width || '자동')}</span>
            <button type="button" data-imgw="25%" title="폭 25%">25%</button>
            <button type="button" data-imgw="50%" title="폭 50%">50%</button>
            <button type="button" data-imgw="75%" title="폭 75%">75%</button>
            <button type="button" data-imgw="100%" title="폭 100%">100%</button>
            ${
              hasOcr
                ? `<button type="button" data-imgocr="copy" title="인식된 글자 클립보드 복사">📋 글자 복사</button>`
                : `<button type="button" data-imgocr="run" title="AI 글자인식 (OCR)">🔍 글자인식</button>`
            }
            <button type="button" data-imgdel="1" style="color:#ff8a80;" title="이미지 삭제">삭제</button>
          </div>
          <img src="${block.dataUrl || ''}" alt="이미지" draggable="false" />
          <div class="img-resize-handle-right" title="마우스로 좌우로 끌어 크기 조절"></div>
          <div class="img-resize-handle-corner" title="마우스로 대각선으로 끌어 크기 조절"></div>
        </div>
        <input type="text" class="block-editable" style="font-size:13px;color:var(--text-muted);margin-top:4px;" placeholder="이미지 설명 입력 (비워두고 Backspace로 삭제)..." value="${escapeHtml(block.text || '')}" />
      `;

      // OCR Copy & Run buttons (Unified click handler)
      const ocrBtn = body.querySelector('[data-imgocr]');
      if (ocrBtn) {
        ocrBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = ocrBtn.dataset.imgocr;
          if (action === 'copy') {
            if (block.ocrText) {
              navigator.clipboard.writeText(block.ocrText);
              showToast('이미지에서 인식된 글자를 복사했습니다.');
            }
          } else if (action === 'run') {
            ocrBtn.textContent = '⏳ 인식 중...';
            ocrBtn.disabled = true;
            await runBackgroundOcrForBlock(note, block);
            if (block.ocrText) {
              ocrBtn.textContent = '📋 글자 복사';
              ocrBtn.title = '인식된 글자 클립보드 복사';
              ocrBtn.dataset.imgocr = 'copy';
              ocrBtn.disabled = false;
            } else {
              ocrBtn.textContent = '🔍 글자인식';
              ocrBtn.disabled = false;
              showToast('글자를 인식하지 못했거나 API 키 및 네트워크를 확인해 주세요.');
            }
          }
        });
      }

      const resizerBox = body.querySelector('.image-resizer-box');
      const sizeBadge = body.querySelector('.img-size-badge');

      // Quick percentage preset buttons
      body.querySelectorAll('[data-imgw]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const w = btn.dataset.imgw;
          block.width = w;
          resizerBox.style.width = w;
          if (sizeBadge) sizeBadge.textContent = w;
          touchNote(note, blocks);
        });
      });

      // Delete image button
      body.querySelector('[data-imgdel]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        blocks.splice(idx, 1);
        if (blocks.length === 0) blocks.push({ id: uid('b'), type: 'p', text: '' });
        touchNote(note, blocks);
        renderActiveNoteEditor();
      });

      // Mouse & Touch Drag-to-Resize
      const startImageResize = (startEvent) => {
        startEvent.preventDefault();
        startEvent.stopPropagation();
        const startX = startEvent.touches ? startEvent.touches[0].clientX : startEvent.clientX;
        const startWidth = resizerBox.getBoundingClientRect().width;
        const maxContainerWidth = body.getBoundingClientRect().width || 800;
        resizerBox.classList.add('resizing');

        const onMove = (moveEvent) => {
          const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
          const deltaX = clientX - startX;
          const nextPx = Math.round(Math.min(maxContainerWidth, Math.max(100, startWidth + deltaX)));
          const widthStr = `${nextPx}px`;
          resizerBox.style.width = widthStr;
          block.width = widthStr;
          if (sizeBadge) sizeBadge.textContent = widthStr;
        };

        const onUp = () => {
          resizerBox.classList.remove('resizing');
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('touchend', onUp);
          touchNote(note, blocks);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
      };

      body.querySelector('.img-resize-handle-right')?.addEventListener('mousedown', startImageResize);
      body.querySelector('.img-resize-handle-corner')?.addEventListener('mousedown', startImageResize);
      body.querySelector('.img-resize-handle-right')?.addEventListener('touchstart', startImageResize, { passive: false });
      body.querySelector('.img-resize-handle-corner')?.addEventListener('touchstart', startImageResize, { passive: false });

      const capInput = body.querySelector('input');
      capInput.addEventListener('input', (e) => {
        block.text = e.target.value;
        touchNote(note, blocks);
      });
      capInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !capInput.value) {
          blocks.splice(idx, 1);
          if (blocks.length === 0) blocks.push({ id: uid('b'), type: 'p', text: '' });
          touchNote(note, blocks);
          renderActiveNoteEditor();
        }
      });
    } else if (block.type === 'table') {
      if (!Array.isArray(block.rows) || block.rows.length === 0) {
        block.rows = [
          ['항목', '내용', '비고'],
          ['', '', '']
        ];
      }
      const tbl = document.createElement('table');
      tbl.className = 'block-table';
      block.rows.forEach((r, rIdx) => {
        const tr = document.createElement('tr');
        r.forEach((cellVal, cIdx) => {
          const td = document.createElement('td');
          const inp = document.createElement('input');
          inp.type = 'text';
          inp.value = cellVal;
          if (rIdx === 0) inp.style.fontWeight = '600';
          inp.addEventListener('input', () => {
            block.rows[rIdx][cIdx] = inp.value;
            touchNote(note, blocks);
          });
          td.appendChild(inp);
          tr.appendChild(td);
        });
        tbl.appendChild(tr);
      });
      const tblActions = document.createElement('div');
      tblActions.style.marginTop = '4px';
      tblActions.style.display = 'flex';
      tblActions.style.gap = '8px';
      tblActions.innerHTML = `
        <button type="button" class="text-btn">+ 행 추가</button>
        <button type="button" class="text-btn">+ 열 추가</button>
        <button type="button" class="text-btn text-danger">표 삭제</button>
      `;
      tblActions.children[0].addEventListener('click', () => {
        const cols = block.rows[0]?.length || 3;
        block.rows.push(new Array(cols).fill(''));
        touchNote(note, blocks);
        renderActiveNoteEditor();
      });
      tblActions.children[1].addEventListener('click', () => {
        block.rows.forEach((r) => r.push(''));
        touchNote(note, blocks);
        renderActiveNoteEditor();
      });
      tblActions.children[2].addEventListener('click', () => {
        blocks.splice(idx, 1);
        if (blocks.length === 0) blocks.push({ id: uid('b'), type: 'p', text: '' });
        touchNote(note, blocks);
        renderActiveNoteEditor();
      });
      body.appendChild(tbl);
      body.appendChild(tblActions);
    } else if (block.type === 'toggle') {
      const wrap = document.createElement('div');
      wrap.className = 'block-toggle';
      wrap.innerHTML = `
        <div class="toggle-header">
          <span class="toggle-arrow">${block.open ? '▼' : '▶'}</span>
          <input type="text" class="block-editable" style="font-weight:600;" placeholder="토글 제목..." value="${escapeHtml(block.text || '')}" />
        </div>
        <div class="toggle-details ${block.open ? '' : 'hidden'}">
          <textarea class="block-editable" rows="2" placeholder="상세 내용 입력...">${escapeHtml(block.details || '')}</textarea>
        </div>
      `;
      wrap.querySelector('.toggle-arrow').addEventListener('click', () => {
        block.open = !block.open;
        touchNote(note, blocks);
        renderActiveNoteEditor();
      });
      const headerInput = wrap.querySelector('input');
      headerInput.addEventListener('input', (e) => {
        block.text = e.target.value;
        touchNote(note, blocks);
      });
      headerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !headerInput.value && !block.details) {
          blocks.splice(idx, 1);
          touchNote(note, blocks);
          renderActiveNoteEditor();
        }
      });
      const dtArea = wrap.querySelector('textarea');
      dtArea.addEventListener('input', (e) => {
        block.details = e.target.value;
        autoResizeTextarea(dtArea);
        touchNote(note, blocks);
      });
      setTimeout(() => autoResizeTextarea(dtArea), 0);
      body.appendChild(wrap);
    } else if (block.type === 'youtube') {
      body.className += ' block-youtube';
      const videoId = block.videoId || extractYouTubeVideoId(block.url || '');
      const thumbUrl = block.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '');
      const videoUrl = block.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
      const title = block.title || 'YouTube 동영상';
      const channel = block.channelTitle || '';

      body.innerHTML = `
        <div class="youtube-player-card" data-video-id="${escapeHtml(videoId || '')}">
          <div class="youtube-media-container">
            <img class="youtube-thumb-img" src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(title)}" loading="lazy" />
            <div class="youtube-play-overlay" title="노트 안에서 바로 재생">
              <button type="button" class="youtube-big-play-btn" aria-label="재생">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>
          </div>
          <div class="youtube-card-meta">
            <div class="youtube-card-info">
              <div class="youtube-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
              ${channel ? `<div class="youtube-card-channel">${escapeHtml(channel)}</div>` : ''}
            </div>
            <div class="youtube-card-actions">
              <button type="button" class="youtube-btn-inline-play" title="노트 내에서 바로 재생">
                <span>▶</span> 바로 재생
              </button>
              <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" class="youtube-btn-app-open" title="유튜브 앱 또는 웹사이트로 열기">
                <span>📺</span> YouTube 앱에서 열기 ↗
              </a>
              <button type="button" class="text-btn text-danger btn-del-youtube" style="padding:4px 8px;font-size:12px;" title="동영상 카드 삭제">삭제</button>
            </div>
          </div>
        </div>
      `;

      const mediaContainer = body.querySelector('.youtube-media-container');
      const startInlinePlay = () => {
        if (!videoId || !mediaContainer) return;
        mediaContainer.innerHTML = `
          <iframe
            src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0"
            title="${escapeHtml(title)}"
            style="width:100%;height:100%;border:0;display:block;"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen>
          </iframe>
        `;
      };

      body.querySelector('.youtube-play-overlay')?.addEventListener('click', startInlinePlay);
      body.querySelector('.youtube-btn-inline-play')?.addEventListener('click', startInlinePlay);
      body.querySelector('.btn-del-youtube')?.addEventListener('click', (e) => {
        e.stopPropagation();
        blocks.splice(idx, 1);
        if (blocks.length === 0) blocks.push({ id: uid('b'), type: 'p', text: '' });
        touchNote(note, blocks);
        renderActiveNoteEditor();
      });
    } else {
      const innerWrap = document.createElement('div');
      if (block.type === 'todo') {
        innerWrap.className = `block-todo-wrap ${block.checked ? 'block-todo-done' : ''}`;
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = Boolean(block.checked);
        chk.addEventListener('change', () => {
          block.checked = chk.checked;
          touchNote(note, blocks);
          renderActiveNoteEditor();
        });
        innerWrap.appendChild(chk);
      } else if (block.type === 'bullet') {
        innerWrap.className = 'block-todo-wrap';
        const bulletChar = block.indent === 1 ? '◦' : (block.indent >= 2 ? '▪' : '•');
        innerWrap.innerHTML = `<span style="padding-top:2px;color:var(--text-secondary);font-size:14px;">${bulletChar}</span>`;
      } else if (block.type === 'number') {
        innerWrap.className = 'block-todo-wrap';
        innerWrap.innerHTML = `<span style="padding-top:2px;color:var(--text-secondary);font-size:14px;">${idx + 1}.</span>`;
      } else if (block.type === 'callout') {
        innerWrap.className = 'block-callout';
      } else if (block.type === 'secret') {
        innerWrap.className = 'block-secret';
      }

      const ta = document.createElement('textarea');
      ta.className = `block-editable ${block.type === 'secret' ? 'secret-masked' : ''}`;
      ta.rows = 1;
      ta.placeholder = getPlaceholderForType(block.type);
      ta.value = block.text || '';

      ta.addEventListener('input', () => {
        const val = ta.value;
        if (block.type === 'p') {
          if (val.startsWith('# ')) {
            block.type = 'h1';
            block.text = val.slice(2);
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id);
            return;
          } else if (val.startsWith('## ')) {
            block.type = 'h2';
            block.text = val.slice(3);
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id);
            return;
          } else if (val.startsWith('### ')) {
            block.type = 'h3';
            block.text = val.slice(4);
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id);
            return;
          } else if (val.startsWith('- ') || val.startsWith('* ')) {
            block.type = 'bullet';
            block.text = val.slice(2);
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id);
            return;
          } else if (val.startsWith('[] ') || val.startsWith('[ ] ')) {
            block.type = 'todo';
            block.text = val.replace(/^\[\s?\]\s/, '');
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id);
            return;
          } else if (val.startsWith('> ')) {
            block.type = 'callout';
            block.text = val.slice(2);
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id);
            return;
          } else if (val === '---') {
            block.type = 'divider';
            block.text = '';
            const nextBlock = { id: uid('b'), type: 'p', text: '' };
            blocks.splice(idx + 1, 0, nextBlock);
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(nextBlock.id);
            return;
          }
        }

        if (val === '/') {
          openSlashMenu(block.id, ta.getBoundingClientRect());
        } else {
          closeSlashMenu();
        }

        block.text = val;
        autoResizeTextarea(ta);
        touchNote(note, blocks);
        renderWikiLinkChipsForBlock(body, block.text);
        renderBacklinksPanel(note, blocks);
      });

      ta.addEventListener('keydown', (e) => {
        // Tab / Shift+Tab: Indent / Outdent list or block
        if (e.key === 'Tab') {
          e.preventDefault();
          recordPreActionSnapshot();
          if (e.shiftKey) {
            block.indent = Math.max((block.indent || 0) - 1, 0);
          } else {
            block.indent = Math.min((block.indent || 0) + 1, 4);
          }
          touchNote(note, blocks);
          renderActiveNoteEditor();
          focusBlock(block.id);
          return;
        }

        // Inline formatting shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          applyFormattingToActiveSelection('bold', ta);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
          e.preventDefault();
          applyFormattingToActiveSelection('italic', ta);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          applyFormattingToActiveSelection('strike', ta);
          return;
        }

        const currentText = typeof ta.value === 'string' ? ta.value : (block.text || '');
        const selStart = typeof ta.selectionStart === 'number' ? ta.selectionStart : currentText.length;
        const selEnd = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : currentText.length;
        const isCollapsed = selStart === selEnd;
        const isMergeableTextType = (t) => ['p', 'h1', 'h2', 'h3', 'bullet', 'number', 'todo', 'quote', 'callout'].includes(t);

        if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
          e.preventDefault();
          closeSlashMenu();
          recordPreActionSnapshot();

          // 1. 빈 목록(todo, bullet, number)에서 엔터 시 들여쓰기 감소 또는 일반 문단(p)으로 변환
          if (['todo', 'bullet', 'number'].includes(block.type) && !currentText.trim()) {
            if ((block.indent || 0) > 0) {
              block.indent = (block.indent || 0) - 1;
              touchNote(note, blocks);
              renderActiveNoteEditor();
              focusBlock(block.id);
              return;
            }
            block.type = 'p';
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id);
            return;
          }

          // 2. [노션 표준] 커서가 문장 맨 앞(0번째)에 있을 때:
          // 현재 블록 위에 새 빈 줄을 삽입하고, 새 빈 줄에 포커스를 줌! (기존 글은 아래로 밀림)
          if (selStart === 0 && currentText.length > 0) {
            const newBlock = { id: uid('b'), type: 'p', text: '', checked: false, indent: block.indent || 0 };
            blocks.splice(idx, 0, newBlock);
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(newBlock.id, 0);
            return;
          }

          // 3. [노션 표준] 커서가 문장 중간 또는 끝에 있을 때:
          // 커서 앞부분은 현재 블록에 남기고, 커서 뒷부분은 새 블록으로 분할하여 아랫줄로 이동
          const headText = currentText.slice(0, selStart);
          const tailText = currentText.slice(selStart);
          block.text = headText;

          // 헤딩(H1/H2/H3) 뒤에서 엔터를 치면 다음 줄은 일반 본문('p')으로 전환, 목록은 목록 타입 유지
          const nextType = ['todo', 'bullet', 'number'].includes(block.type) ? block.type : 'p';
          const newBlock = { id: uid('b'), type: nextType, text: tailText, checked: false, indent: block.indent || 0 };
          blocks.splice(idx + 1, 0, newBlock);
          touchNote(note, blocks);
          renderActiveNoteEditor();
          focusBlock(newBlock.id, 0);
          return;
        } else if (e.key === 'Backspace' && isCollapsed && selStart === 0) {
          // [노션 표준] 커서가 문장 맨 앞(0번째)에 있을 때 Backspace:
          if ((block.indent || 0) > 0) {
            e.preventDefault();
            closeSlashMenu();
            recordPreActionSnapshot();
            block.indent = (block.indent || 0) - 1;
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id, 0);
            return;
          }
          if (block.type !== 'p' && isMergeableTextType(block.type)) {
            e.preventDefault();
            closeSlashMenu();
            recordPreActionSnapshot();
            block.type = 'p';
            touchNote(note, blocks);
            renderActiveNoteEditor();
            focusBlock(block.id, 0);
            return;
          }
          if (idx > 0) {
            const prevBlock = blocks[idx - 1];
            if (currentText === '') {
              // 현재 블록이 빈 블록이면 현재 블록 삭제하고 이전 블록 끝으로 이동
              e.preventDefault();
              closeSlashMenu();
              recordPreActionSnapshot();
              blocks.splice(idx, 1);
              touchNote(note, blocks);
              renderActiveNoteEditor();
              focusBlock(prevBlock.id);
              return;
            } else if (isMergeableTextType(prevBlock.type) && isMergeableTextType(block.type)) {
              // 내용이 있는 경우 이전 텍스트 블록 끝에 현재 줄 내용 병합
              e.preventDefault();
              closeSlashMenu();
              recordPreActionSnapshot();
              const mergePos = (prevBlock.text || '').length;
              prevBlock.text = (prevBlock.text || '') + currentText;
              blocks.splice(idx, 1);
              touchNote(note, blocks);
              renderActiveNoteEditor();
              focusBlock(prevBlock.id, mergePos);
              return;
            } else if (prevBlock.type === 'divider') {
              // 윗줄이 구분선이면 구분선 삭제
              e.preventDefault();
              closeSlashMenu();
              recordPreActionSnapshot();
              blocks.splice(idx - 1, 1);
              touchNote(note, blocks);
              renderActiveNoteEditor();
              focusBlock(block.id, 0);
              return;
            }
          } else if (currentText === '' && blocks.length > 1) {
            // 최상단 빈 블록 삭제
            e.preventDefault();
            closeSlashMenu();
            recordPreActionSnapshot();
            blocks.splice(idx, 1);
            touchNote(note, blocks);
            renderActiveNoteEditor();
            if (blocks[0]) focusBlock(blocks[0].id, 0);
            return;
          }
        } else if (e.key === 'Delete' && isCollapsed && selStart === currentText.length) {
          // [노션 표준] 커서가 문장 맨 뒤에 있을 때 Delete:
          if (idx < blocks.length - 1) {
            const nextBlock = blocks[idx + 1];
            if (isMergeableTextType(block.type) && isMergeableTextType(nextBlock.type)) {
              // 아랫줄 내용을 끌어올려 현재 블록 끝에 병합
              e.preventDefault();
              closeSlashMenu();
              recordPreActionSnapshot();
              const mergePos = currentText.length;
              block.text = currentText + (nextBlock.text || '');
              blocks.splice(idx + 1, 1);
              touchNote(note, blocks);
              renderActiveNoteEditor();
              focusBlock(block.id, mergePos);
              return;
            } else if (nextBlock.type === 'divider') {
              // 아랫줄이 구분선이면 구분선 삭제
              e.preventDefault();
              closeSlashMenu();
              recordPreActionSnapshot();
              blocks.splice(idx + 1, 1);
              touchNote(note, blocks);
              renderActiveNoteEditor();
              focusBlock(block.id, currentText.length);
              return;
            }
          }
        } else if (e.key === 'ArrowUp' && ta.selectionStart === 0 && idx > 0) {
          e.preventDefault();
          focusBlock(blocks[idx - 1].id);
        } else if (e.key === 'ArrowDown' && ta.selectionEnd === ta.value.length && idx < blocks.length - 1) {
          e.preventDefault();
          focusBlock(blocks[idx + 1].id);
        }
      });

      // Ctrl+Click (or Cmd+Click) directly on a URL inside textarea opens it
      ta.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) {
          const urls = extractWebUrls(ta.value);
          if (urls.length > 0) {
            window.open(urls[0], '_blank', 'noopener,noreferrer');
          }
        }
      });

      const hasSearchMatch = Boolean(pendingEditorSearchHighlight && (block.text || '').toLowerCase().includes(pendingEditorSearchHighlight.toLowerCase()));
      const hasFormatting = hasSearchMatch || /(\*\*|\*|~~|==|<span\s+style=|\[\[)/.test(block.text || '');
      const previewDiv = document.createElement('div');
      previewDiv.className = `block-preview-overlay ${hasFormatting ? '' : 'hidden'}`;
      let renderedHtml = renderMarkdownInlineHtml(block.text || '');
      if (pendingEditorSearchHighlight) {
        renderedHtml = highlightHtmlText(renderedHtml, pendingEditorSearchHighlight);
      }
      previewDiv.innerHTML = renderedHtml;

      const activateBlockEditor = () => {
        previewDiv.classList.add('hidden');
        ta.classList.remove('hidden');
        autoResizeTextarea(ta);
        ta.scrollTop = 0;
        ta.focus();
      };

      previewDiv.addEventListener('click', activateBlockEditor);

      ta.addEventListener('focus', () => {
        if (!previewDiv.classList.contains('hidden')) {
          previewDiv.classList.add('hidden');
          ta.classList.remove('hidden');
        }
        autoResizeTextarea(ta);
        ta.scrollTop = 0;
      });

      ta.addEventListener('blur', () => {
        setTimeout(() => {
          if (document.activeElement !== ta) {
            const hasQuery = Boolean(pendingEditorSearchHighlight && (ta.value || '').toLowerCase().includes(pendingEditorSearchHighlight.toLowerCase()));
            const stillHasFormatting = hasQuery || /(\*\*|\*|~~|==|<span\s+style=|\[\[)/.test(ta.value || '');
            if (stillHasFormatting) {
              let updatedHtml = renderMarkdownInlineHtml(ta.value || '');
              if (pendingEditorSearchHighlight) {
                updatedHtml = highlightHtmlText(updatedHtml, pendingEditorSearchHighlight);
              }
              previewDiv.innerHTML = updatedHtml;
              previewDiv.classList.remove('hidden');
              ta.classList.add('hidden');
            } else {
              previewDiv.classList.add('hidden');
              ta.classList.remove('hidden');
            }
          }
        }, 120);
      });

      if (hasFormatting) {
        ta.classList.add('hidden');
      }

      // Track text selection for floating formatting toolbar
      const updateSelectionToolbar = () => {
        handleBlockTextSelection(ta);
      };
      ta.addEventListener('mouseup', updateSelectionToolbar);
      ta.addEventListener('keyup', updateSelectionToolbar);
      ta.addEventListener('touchend', () => {
        setTimeout(updateSelectionToolbar, 100);
      });
      ta.addEventListener('select', updateSelectionToolbar);

      innerWrap.appendChild(previewDiv);
      innerWrap.appendChild(ta);
      body.appendChild(innerWrap);
      renderWikiLinkChipsForBlock(body, block.text);
      setTimeout(() => autoResizeTextarea(ta), 0);
    }

    row.appendChild(gutter);
    row.appendChild(body);
    container.appendChild(row);
  });
}

function renderWikiLinkChipsForBlock(bodyEl, text = '') {
  const existing = bodyEl.querySelector('.wikilink-chips');
  if (existing) existing.remove();
  const wikiLinks = extractWikiLinks(text);
  const webUrls = extractWebUrls(text);
  if (wikiLinks.length === 0 && webUrls.length === 0) return;

  const wrap = document.createElement('div');
  wrap.className = 'wikilink-chips';

  // 1. Render clickable Web URL pills (opens original webpage in new tab)
  const isSourceBlock = /^\s*(출처|원문)\s*[:：]/.test(text);
  for (const url of webUrls) {
    const a = document.createElement('a');
    a.className = 'url-link-pill';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = `클릭하여 웹페이지 열기: ${url}`;
    let displayUrl = url;
    try {
      const u = new URL(url);
      const shortPath = u.pathname && u.pathname !== '/' ? u.pathname.slice(0, 28) : '';
      displayUrl = `${u.hostname}${shortPath}${u.pathname.length > 28 ? '...' : ''}`;
    } catch {}
    a.textContent = isSourceBlock
      ? `↗ 원문 문서로 이동 (${displayUrl})`
      : `↗ 웹 링크 열기: ${displayUrl}`;
    a.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    wrap.appendChild(a);
  }

  // 2. Render internal [[WikiLink]] pills
  for (const title of wikiLinks) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wikilink-pill';
    const target = state.notes.find((n) => !n.trashed && (n.title || '').trim().toLowerCase() === title.toLowerCase());
    btn.textContent = target ? `↗ ${title}` : `+ 새 노트 생성: ${title}`;
    btn.addEventListener('click', () => openOrCreateWikiLink(title));
    wrap.appendChild(btn);
  }
  bodyEl.appendChild(wrap);
}

function openOrCreateWikiLink(title) {
  let target = state.notes.find((n) => !n.trashed && (n.title || '').trim().toLowerCase() === title.toLowerCase());
  if (!target) {
    const now = new Date().toISOString();
    target = {
      id: uid('note'),
      title,
      folderId: getActiveNote()?.folderId || state.folders[0]?.id || 'f_work',
      docType: 'note',
      status: '',
      priority: 'normal',
      favorite: false,
      trashed: false,
      isEncrypted: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
      blocks: [
        { id: uid('b'), type: 'p', text: `[[${getActiveNote()?.title || '이전 노트'}]] 문서에서 연결됨` }
      ]
    };
    state.notes.unshift(target);
    scheduleSave();
  }
  openNoteInEditor(target.id);
}

function renderBacklinksPanel(note, blocks) {
  const panel = document.getElementById('backlinks-panel');
  const outboundEl = document.getElementById('outbound-links-list');
  const backlinksEl = document.getElementById('backlinks-list');
  if (!panel || !outboundEl || !backlinksEl) return;

  const outTitles = new Set();
  for (const b of blocks || []) {
    for (const t of extractWikiLinks(b.text)) outTitles.add(t);
  }

  const currentTitle = (note.title || '').trim().toLowerCase();
  const inboundNotes = currentTitle
    ? state.notes.filter((other) => {
        if (other.id === note.id || other.trashed || other.isEncrypted) return false;
        return (other.blocks || []).some((b) =>
          extractWikiLinks(b.text).some((linkTitle) => linkTitle.toLowerCase() === currentTitle)
        );
      })
    : [];

  if (outTitles.size === 0 && inboundNotes.length === 0) {
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');

  outboundEl.innerHTML = '';
  for (const t of outTitles) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wikilink-pill';
    btn.textContent = t;
    btn.addEventListener('click', () => openOrCreateWikiLink(t));
    outboundEl.appendChild(btn);
  }

  backlinksEl.innerHTML = '';
  for (const inNote of inboundNotes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wikilink-pill';
    btn.textContent = inNote.title;
    btn.addEventListener('click', () => openNoteInEditor(inNote.id));
    backlinksEl.appendChild(btn);
  }
}

function autoResizeTextarea(ta) {
  if (!ta) return;
  // If element is hidden in DOM, scrollHeight cannot be measured accurately
  if (ta.offsetParent === null && ta.classList.contains('hidden')) {
    return;
  }
  ta.style.height = 'auto';
  ta.style.height = `${Math.max(26, ta.scrollHeight)}px`;
}

function getPlaceholderForType(type) {
  const map = {
    p: "내용을 입력하세요 ('/'로 블록 메뉴, '[[제목]]'으로 문서 연결)",
    h1: '제목 1',
    h2: '제목 2',
    h3: '제목 3',
    todo: '할 일',
    bullet: '목록',
    number: '번호 목록',
    callout: '강조할 내용 입력...',
    code: '코드 입력...',
    secret: '마우스를 올릴 때만 보이는 보안 텍스트...'
  };
  return map[type] || '';
}

function focusBlock(blockId, cursorPos = null) {
  setTimeout(() => {
    const row = document.querySelector(`.block-row[data-block-id="${blockId}"]`);
    const input = row?.querySelector('.block-editable');
    if (input) {
      const prev = row?.querySelector('.block-preview-overlay');
      if (prev && !prev.classList.contains('hidden')) {
        prev.classList.add('hidden');
        input.classList.remove('hidden');
      }
      autoResizeTextarea(input);
      input.scrollTop = 0;
      input.focus();
      if (input.setSelectionRange) {
        const pos = typeof cursorPos === 'number' ? Math.max(0, Math.min(input.value.length, cursorPos)) : input.value.length;
        input.setSelectionRange(pos, pos);
      }
    }
  }, 10);
}

// ============================================================================
// Note Editor Undo / Redo Engine (Ctrl+Z / Ctrl+Y & Mobile Buttons)
// ============================================================================
let noteUndoStack = [];
let noteRedoStack = [];
let lastSnapshotNoteId = null;
let lastSnapshotJson = '';
let undoDebounceTimer = null;

function getNoteSnapshot(note) {
  if (!note) return null;
  const blocks = getEditableBlocksForNote(note) || [];
  return {
    noteId: note.id,
    title: note.title || '',
    blocks: JSON.parse(JSON.stringify(blocks))
  };
}

function updateUndoRedoButtonState() {
  const btnUndo = document.getElementById('btn-editor-undo');
  const btnRedo = document.getElementById('btn-editor-redo');
  if (btnUndo) {
    btnUndo.disabled = noteUndoStack.length === 0;
  }
  if (btnRedo) {
    btnRedo.disabled = noteRedoStack.length === 0;
  }
}

function initNoteUndoHistory(note) {
  if (!note) return;
  if (lastSnapshotNoteId !== note.id) {
    noteUndoStack = [];
    noteRedoStack = [];
    lastSnapshotNoteId = note.id;
    const snap = getNoteSnapshot(note);
    lastSnapshotJson = snap ? JSON.stringify({ title: snap.title, blocks: snap.blocks }) : '';
    updateUndoRedoButtonState();
  }
}

function recordPreActionSnapshot() {
  const note = getActiveNote();
  if (!note) return;
  const snap = getNoteSnapshot(note);
  if (!snap) return;
  const snapJson = JSON.stringify({ title: snap.title, blocks: snap.blocks });
  if (lastSnapshotJson && lastSnapshotJson !== snapJson) {
    noteUndoStack.push(JSON.parse(lastSnapshotJson));
    if (noteUndoStack.length > 60) noteUndoStack.shift();
    noteRedoStack = [];
  }
  lastSnapshotJson = snapJson;
  updateUndoRedoButtonState();
}

function pushUndoSnapshot(immediate = false) {
  const note = getActiveNote();
  if (!note) return;
  const snap = getNoteSnapshot(note);
  if (!snap) return;
  const snapJson = JSON.stringify({ title: snap.title, blocks: snap.blocks });

  if (lastSnapshotNoteId !== note.id) {
    initNoteUndoHistory(note);
    return;
  }

  if (snapJson === lastSnapshotJson) return;

  clearTimeout(undoDebounceTimer);
  if (immediate) {
    if (lastSnapshotJson) {
      noteUndoStack.push(JSON.parse(lastSnapshotJson));
      if (noteUndoStack.length > 60) noteUndoStack.shift();
      noteRedoStack = [];
    }
    lastSnapshotJson = snapJson;
    updateUndoRedoButtonState();
  } else {
    undoDebounceTimer = setTimeout(() => {
      if (lastSnapshotJson && lastSnapshotJson !== snapJson) {
        noteUndoStack.push(JSON.parse(lastSnapshotJson));
        if (noteUndoStack.length > 60) noteUndoStack.shift();
        noteRedoStack = [];
      }
      lastSnapshotJson = snapJson;
      updateUndoRedoButtonState();
    }, 400);
  }
}

function performUndo() {
  const note = getActiveNote();
  if (!note || noteUndoStack.length === 0) return false;
  clearTimeout(undoDebounceTimer);

  const currentBlocks = getEditableBlocksForNote(note) || [];
  const currentSnap = { title: note.title || '', blocks: JSON.parse(JSON.stringify(currentBlocks)) };
  noteRedoStack.push(currentSnap);

  const prevSnap = noteUndoStack.pop();
  note.title = prevSnap.title;
  if (note.isEncrypted && unlockedVaultPassword) {
    unlockedDecryptedBlocks[note.id] = prevSnap.blocks;
  } else {
    note.blocks = prevSnap.blocks;
  }
  lastSnapshotJson = JSON.stringify({ title: prevSnap.title, blocks: prevSnap.blocks });

  touchNote(note, prevSnap.blocks);
  renderActiveNoteEditor();
  updateUndoRedoButtonState();
  showToast('되돌리기 완료 (Undo)', 1200);
  return true;
}

function performRedo() {
  const note = getActiveNote();
  if (!note || noteRedoStack.length === 0) return false;
  clearTimeout(undoDebounceTimer);

  const currentBlocks = getEditableBlocksForNote(note) || [];
  const currentSnap = { title: note.title || '', blocks: JSON.parse(JSON.stringify(currentBlocks)) };
  noteUndoStack.push(currentSnap);

  const nextSnap = noteRedoStack.pop();
  note.title = nextSnap.title;
  if (note.isEncrypted && unlockedVaultPassword) {
    unlockedDecryptedBlocks[note.id] = nextSnap.blocks;
  } else {
    note.blocks = nextSnap.blocks;
  }
  lastSnapshotJson = JSON.stringify({ title: nextSnap.title, blocks: nextSnap.blocks });

  touchNote(note, nextSnap.blocks);
  renderActiveNoteEditor();
  updateUndoRedoButtonState();
  showToast('다시 실행 완료 (Redo)', 1200);
  return true;
}

/**
 * Light-weight touchNote that does NOT rebuild the editor DOM during typing
 */
function touchNote(note, updatedBlocks = null) {
  if (!note || note.trashed) return;
  pushUndoSnapshot(false);
  note.updatedAt = new Date().toISOString();
  if (note.isEncrypted && updatedBlocks && unlockedVaultPassword) {
    VaultCrypto.encryptData(updatedBlocks, unlockedVaultPassword).then((enc) => {
      note.encryptedPayload = enc;
      scheduleSave();
    });
  } else {
    scheduleSave();
  }
  // Update sidebar quick note title in place without full re-render
  const quickRow = document.querySelector(`[data-quick-note-id="${note.id}"] .note-list-row-title`);
  if (quickRow) {
    const prefix = note.isEncrypted ? '[잠금] ' : note.favorite ? '★ ' : '';
    quickRow.textContent = prefix + (note.title || '제목 없음');
  }
  const folder = state.folders.find((f) => f.id === note.folderId);
  document.getElementById('active-note-breadcrumb').textContent =
    `${folder ? folder.name : '노트'} / ${note.title || '제목 없음'}`;
}

// ============================================================================
// Slash Menu (/) & Block Actions
// ============================================================================
function openSlashMenu(blockId, rect) {
  slashTargetBlockId = blockId;
  const menu = document.getElementById('slash-menu');
  menu.classList.remove('hidden');
  const top = Math.min(window.innerHeight - 350, Math.max(16, rect.bottom + 4));
  const left = Math.min(window.innerWidth - 260, Math.max(16, rect.left));
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
}

function closeSlashMenu() {
  slashTargetBlockId = null;
  document.getElementById('slash-menu')?.classList.add('hidden');
}

function applyBlockType(blockId, newType) {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  recordPreActionSnapshot();

  // If multiple blocks are selected and this block is among them, convert ALL selected blocks!
  const targetIds = (selectedBlockIds.size > 1 && selectedBlockIds.has(blockId))
    ? Array.from(selectedBlockIds)
    : [blockId];

  let convertedCount = 0;
  for (const id of targetIds) {
    const target = blocks.find((b) => b.id === id);
    if (target) {
      target.type = newType;
      if (target.text === '/') target.text = '';
      if (newType === 'todo' && target.checked === undefined) {
        target.checked = false;
      }
      if (newType === 'table' && !target.rows) {
        target.rows = [
          ['항목', '내용', '비고'],
          ['', '', '']
        ];
      }
      convertedCount++;
    }
  }

  touchNote(note, blocks);
  renderActiveNoteEditor();
  if (targetIds.length > 1) {
    showToast(`${convertedCount}개 블록이 '${getBlockTypeLabel(newType)}'(으)로 일괄 변환되었습니다.`);
  } else {
    focusBlock(blockId);
  }
  closeSlashMenu();
}

function executeBlockAction(blockId, action) {
  if (action === 'select') {
    closeSlashMenu();
    toggleBlockSelection(blockId);
    return;
  }
  if (action === 'summarize') {
    closeSlashMenu();
    summarizeCurrentActiveNote();
    return;
  }
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx === -1) return;

  recordPreActionSnapshot();
  if (action === 'up' && idx > 0) {
    const tmp = blocks[idx - 1];
    blocks[idx - 1] = blocks[idx];
    blocks[idx] = tmp;
  } else if (action === 'down' && idx < blocks.length - 1) {
    const tmp = blocks[idx + 1];
    blocks[idx + 1] = blocks[idx];
    blocks[idx] = tmp;
  } else if (action === 'delete') {
    blocks.splice(idx, 1);
    if (blocks.length === 0) blocks.push({ id: uid('b'), type: 'p', text: '' });
  }

  touchNote(note, blocks);
  renderActiveNoteEditor();
  closeSlashMenu();
}

// ============================================================================
// Split View (보조 분할 화면 - 참조 문서 리치 뷰어 및 실시간 검색)
// ============================================================================
function renderSplitPickerDropdown(query = '') {
  const dropdown = document.getElementById('split-picker-dropdown');
  if (!dropdown) return;

  const activeNotes = state.notes.filter((n) => !n.trashed);
  const q = (query || '').toLowerCase().trim();

  let matchedNotes = [];
  const currentNote = activeNotes.find((n) => n.id === secondaryNoteId);
  const isQueryCurrentTitle = currentNote && (currentNote.title || '').toLowerCase().trim() === q;

  if (!q || isQueryCurrentTitle) {
    matchedNotes = [...activeNotes].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  } else {
    const exactTitle = [];
    const startsTitle = [];
    const containsTitle = [];
    const tagMatch = [];
    const bodyMatch = [];

    for (const n of activeNotes) {
      const titleLower = (n.title || '').toLowerCase();
      const tags = Array.isArray(n.tags) ? n.tags : [];
      const hasTagMatch = tags.some((t) => (t || '').toLowerCase().includes(q));

      if (titleLower === q) {
        exactTitle.push(n);
      } else if (titleLower.startsWith(q)) {
        startsTitle.push(n);
      } else if (titleLower.includes(q)) {
        containsTitle.push(n);
      } else if (hasTagMatch) {
        tagMatch.push(n);
      } else {
        const blocks = getEditableBlocksForNote(n) || [];
        const hasBodyMatch = blocks.some((b) => (b.text || '').toLowerCase().includes(q));
        if (hasBodyMatch) {
          bodyMatch.push(n);
        }
      }
    }

    matchedNotes = [
      ...exactTitle,
      ...startsTitle,
      ...containsTitle,
      ...tagMatch,
      ...bodyMatch
    ];
  }

  if (matchedNotes.length === 0) {
    dropdown.innerHTML = `
      <div class="split-picker-empty">
        <span>'${escapeHtml(query)}' 검색 결과가 없습니다.</span>
      </div>`;
    return;
  }

  const folderMap = new Map(state.folders.map((f) => [f.id, f.name]));
  const countLabel = q && !isQueryCurrentTitle ? `검색 결과 ${matchedNotes.length}개` : `전체 노트 (${matchedNotes.length}개)`;

  dropdown.innerHTML = `
    <div class="split-picker-header">${countLabel}</div>
    ${matchedNotes.slice(0, 40).map((n) => {
      const folderName = folderMap.get(n.folderId) || '';
      const icon = n.isPinned ? '📌' : (n.isEncrypted ? '🔒' : '📄');
      const isSelected = n.id === secondaryNoteId;
      const dateStr = formatDate(n.updatedAt || n.createdAt);

      return `
        <div class="split-picker-item ${isSelected ? 'active' : ''}" data-note-id="${n.id}">
          <span class="split-picker-item-icon">${icon}</span>
          <div class="split-picker-item-info">
            <div class="split-picker-item-title">${escapeHtml(n.title || '제목 없음')}</div>
            <div class="split-picker-item-sub">
              ${folderName ? `<span class="picker-folder">📁 ${escapeHtml(folderName)}</span>` : ''}
              ${dateStr ? `<span class="picker-time">🕒 ${dateStr}</span>` : ''}
            </div>
          </div>
          ${isSelected ? '<span class="split-picker-check">✓</span>' : ''}
        </div>
      `;
    }).join('')}
  `;

  dropdown.querySelectorAll('.split-picker-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const nId = item.dataset.noteId;
      if (!nId) return;
      secondaryNoteId = nId;
      dropdown.classList.add('hidden');
      syncNavigationHistory();
      renderSecondarySplitPane();
    });
  });
}

function renderSecondarySplitPane() {
  const pane = document.getElementById('secondary-split-pane');
  const isSplit = activeViewMode === 'split';
  pane.classList.toggle('hidden', !isSplit);
  if (!isSplit) return;

  const activeNotes = state.notes.filter((n) => !n.trashed);
  if (!secondaryNoteId || !activeNotes.some((n) => n.id === secondaryNoteId)) {
    const other = activeNotes.find((n) => n.id !== activeNoteId) || activeNotes[0];
    secondaryNoteId = other?.id || null;
  }

  const secNote = activeNotes.find((n) => n.id === secondaryNoteId);
  const searchInput = document.getElementById('split-note-search-input');
  const clearBtn = document.getElementById('btn-clear-split-search');
  if (searchInput && document.activeElement !== searchInput) {
    searchInput.value = secNote ? (secNote.title || '제목 없음') : '';
    if (clearBtn) clearBtn.classList.toggle('hidden', !searchInput.value);
  }

  const viewer = document.getElementById('secondary-note-viewer');
  if (!secNote) {
    viewer.innerHTML = `
      <div class="split-view-empty">
        <p class="text-muted">참조할 노트를 상단 검색창에서 선택해 주세요.</p>
      </div>`;
    return;
  }

  if (secNote.isEncrypted && !decryptedNotesSessionMap.has(secNote.id)) {
    viewer.innerHTML = `
      <div class="split-view-locked">
        <div class="locked-icon">🔒</div>
        <h3>암호화된 보안 노트입니다</h3>
        <p class="text-muted" style="margin-top:6px;max-width:320px;">내용을 참조하려면 메인 편집기에서 비밀번호를 입력해 잠금을 해제해 주세요.</p>
      </div>`;
    return;
  }

  const secBlocks = getEditableBlocksForNote(secNote) || [];
  const folder = state.folders.find((f) => f.id === secNote.folderId);
  const updatedDateStr = formatDate(secNote.updatedAt || secNote.createdAt);

  let listNumberCounter = 0;

  const blocksHtml = secBlocks.map((b) => {
    if (b.type !== 'number') {
      listNumberCounter = 0;
    }

    switch (b.type) {
      case 'h1':
        return `<h1 class="split-doc-h1">${renderMarkdownInlineHtml(b.text || '')}</h1>`;
      case 'h2':
        return `<h2 class="split-doc-h2">${renderMarkdownInlineHtml(b.text || '')}</h2>`;
      case 'h3':
        return `<h3 class="split-doc-h3">${renderMarkdownInlineHtml(b.text || '')}</h3>`;
      case 'callout':
        return `
          <div class="split-doc-callout">
            <span class="callout-icon">💡</span>
            <div class="callout-content">${renderMarkdownInlineHtml(b.text || '')}</div>
          </div>`;
      case 'quote':
        return `<blockquote class="split-doc-quote">${renderMarkdownInlineHtml(b.text || '')}</blockquote>`;
      case 'todo':
        return `
          <div class="split-doc-todo ${b.checked ? 'is-done' : ''}">
            <input type="checkbox" class="split-todo-checkbox" ${b.checked ? 'checked' : ''} disabled />
            <span class="todo-text">${renderMarkdownInlineHtml(b.text || '')}</span>
          </div>`;
      case 'bullet': {
        const indent = b.indent || 0;
        const bulletChar = indent === 1 ? '◦' : (indent >= 2 ? '▪' : '•');
        return `
          <div class="split-doc-bullet" style="margin-left:${indent * 20}px;">
            <span class="bullet-dot">${bulletChar}</span>
            <span class="bullet-text">${renderMarkdownInlineHtml(b.text || '')}</span>
          </div>`;
      }
      case 'number': {
        listNumberCounter += 1;
        const indent = b.indent || 0;
        return `
          <div class="split-doc-number" style="margin-left:${indent * 20}px;">
            <span class="number-label">${listNumberCounter}.</span>
            <span class="number-text">${renderMarkdownInlineHtml(b.text || '')}</span>
          </div>`;
      }
      case 'code':
        return `
          <div class="split-doc-code-wrap">
            <pre class="split-doc-code"><code>${escapeHtml(b.text || '')}</code></pre>
          </div>`;
      case 'toggle':
        return `
          <details class="split-doc-toggle" ${b.open ? 'open' : ''}>
            <summary class="split-toggle-summary">${renderMarkdownInlineHtml(b.text || '상세 보기')}</summary>
            <div class="split-toggle-details">${renderMarkdownInlineHtml(b.details || '')}</div>
          </details>`;
      case 'divider':
        return `<hr class="split-doc-divider" />`;
      case 'image':
        return `
          <div class="split-doc-image-wrap" style="${b.width ? `width:${b.width};max-width:100%;` : ''}">
            <img src="${b.dataUrl || ''}" alt="${escapeHtml(b.text || '참조 이미지')}" loading="lazy" />
            ${b.text ? `<figcaption class="split-image-caption">${renderMarkdownInlineHtml(b.text)}</figcaption>` : ''}
          </div>`;
      case 'youtube': {
        const videoId = b.videoId || extractYouTubeVideoId(b.url || '');
        const thumbUrl = b.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '');
        const videoUrl = b.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : '');
        const title = b.title || 'YouTube 동영상';
        return `
          <div class="split-doc-youtube" style="max-width:760px;margin:12px auto;">
            <div style="position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;">
              <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(title)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" />
              <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25);text-decoration:none;">
                <div style="width:56px;height:40px;background:#ff0000;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </a>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:13px;">
              <span style="font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(title)}</span>
              <a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" style="color:#ff5252;text-decoration:none;font-weight:600;white-space:nowrap;margin-left:8px;">YouTube 앱에서 열기 ↗</a>
            </div>
          </div>
        `;
      }
      case 'table': {
        const rows = Array.isArray(b.rows) ? b.rows : [];
        if (rows.length === 0) return '';
        return `
          <div class="split-doc-table-wrap">
            <table class="split-doc-table">
              <tbody>
                ${rows.map((row, rIdx) => `
                  <tr>
                    ${row.map((cell) => rIdx === 0
                      ? `<th>${renderMarkdownInlineHtml(cell || '')}</th>`
                      : `<td>${renderMarkdownInlineHtml(cell || '')}</td>`
                    ).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`;
      }
      case 'secret':
        return `
          <div class="split-doc-secret" title="클릭하여 비밀 내용 보기/숨기기">
            <span class="secret-badge">🔒 보안 내용</span>
            <span class="secret-text masked">${escapeHtml(b.text || '')}</span>
          </div>`;
      case 'p':
      default:
        if (!b.text) return '<p class="split-doc-empty-p">&nbsp;</p>';
        return `<p class="split-doc-p">${renderMarkdownInlineHtml(b.text)}</p>`;
    }
  }).join('');

  viewer.innerHTML = `
    <div class="split-doc-header">
      <div class="split-doc-meta">
        ${folder ? `<span class="split-meta-folder">📁 ${escapeHtml(folder.name)}</span>` : ''}
        ${secNote.isPinned ? `<span class="split-meta-pin">📌 고정됨</span>` : ''}
        ${updatedDateStr ? `<span class="split-meta-date">🕒 ${updatedDateStr}</span>` : ''}
      </div>
      <h1 class="split-doc-title">${escapeHtml(secNote.title || '제목 없음')}</h1>
      ${Array.isArray(secNote.tags) && secNote.tags.length > 0 ? `
        <div class="split-doc-tags">
          ${secNote.tags.map((t) => `<span class="split-tag-pill">#${escapeHtml(t)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
    <div class="split-doc-body">
      ${blocksHtml || '<p class="text-muted">내용이 비어 있는 노트입니다.</p>'}
    </div>
  `;

  // Secret toggles in secondary viewer
  viewer.querySelectorAll('.split-doc-secret').forEach((secretEl) => {
    secretEl.addEventListener('click', () => {
      const txt = secretEl.querySelector('.secret-text');
      if (txt) {
        txt.classList.toggle('masked');
      }
    });
  });

  // Wikilink click handlers inside secondary viewer
  viewer.querySelectorAll('.wikilink-pill').forEach((pill) => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetTitle = pill.dataset.wikitarget;
      if (!targetTitle) return;
      const targetNote = state.notes.find((n) => !n.trashed && n.title === targetTitle);
      if (targetNote) {
        secondaryNoteId = targetNote.id;
        syncNavigationHistory();
        renderSecondarySplitPane();
      } else {
        showToast(`'${targetTitle}' 노트를 찾을 수 없습니다.`);
      }
    });
  });
}

// ============================================================================
// Table DB View & Kanban Board View
// ============================================================================
function renderTableView() {
  const tbody = document.getElementById('db-table-body');
  tbody.innerHTML = '';
  const notes = getFilteredNotes();
  const folderMap = new Map(state.folders.map((f) => [f.id, f.name]));
  const statusLabels = { '': '-', todo: '대기', in_progress: '진행중', done: '완료', archived: '보관' };

  for (const n of notes) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(n.title || '제목 없음')}</strong></td>
      <td>${escapeHtml(folderMap.get(n.folderId) || '-')}</td>
      <td>${statusLabels[n.status] || '-'}</td>
      <td>${(n.tags || []).map((t) => `#${escapeHtml(t)}`).join(' ')}</td>
      <td>${n.isEncrypted ? '암호화됨' : '-'}</td>
      <td>${formatDate(n.updatedAt)}</td>
    `;
    tr.addEventListener('click', () => openNoteInEditor(n.id));
    tbody.appendChild(tr);
  }
}

function renderKanbanView() {
  const board = document.getElementById('kanban-board');
  board.innerHTML = '';
  const columns = [
    { key: 'todo', title: '대기' },
    { key: 'in_progress', title: '진행중' },
    { key: 'done', title: '완료' },
    { key: 'archived', title: '보관' },
    { key: '', title: '상태 없음 (-)' }
  ];
  const notes = getFilteredNotes();

  for (const col of columns) {
    const colNotes = notes.filter((n) => (n.status || '') === col.key);
    const colEl = document.createElement('div');
    colEl.className = 'kanban-col';
    colEl.innerHTML = `
      <div class="kanban-col-header">
        <span>${col.title}</span>
        <span>${colNotes.length}</span>
      </div>
    `;

    colEl.addEventListener('dragover', (e) => {
      if (!draggedNoteId) return;
      e.preventDefault();
      colEl.classList.add('folder-drop-hover');
    });
    colEl.addEventListener('dragleave', () => {
      colEl.classList.remove('folder-drop-hover');
    });
    colEl.addEventListener('drop', (e) => {
      if (!draggedNoteId) return;
      e.preventDefault();
      colEl.classList.remove('folder-drop-hover');
      const targetNote = state.notes.find((nt) => nt.id === draggedNoteId);
      draggedNoteId = null;
      if (targetNote) {
        targetNote.status = col.key;
        touchNote(targetNote);
        renderKanbanView();
      }
    });

    for (const n of colNotes) {
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(n.title || '제목 없음')}</div>
        <div class="text-muted" style="font-size:12px;margin-bottom:8px;">${escapeHtml(getNotePlainSnippet(n))}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="text-muted" style="font-size:11px;">${formatDate(n.updatedAt)}</span>
          <select class="meta-select kanban-status-Quick">
            ${columns.map((c) => `<option value="${c.key}" ${c.key === col.key ? 'selected' : ''}>${c.title}</option>`).join('')}
          </select>
        </div>
      `;
      attachNoteRowDragEvents(card, n.id);
      card.querySelector('.kanban-status-Quick').addEventListener('click', (e) => e.stopPropagation());
      card.querySelector('.kanban-status-Quick').addEventListener('change', (e) => {
        n.status = e.target.value;
        touchNote(n);
        renderKanbanView();
      });
      card.addEventListener('click', () => openNoteInEditor(n.id));
      colEl.appendChild(card);
    }
    board.appendChild(colEl);
  }
}

// ============================================================================
// Secure Vault View
// ============================================================================
async function renderSecureVaultView() {
  const lockedScreen = document.getElementById('vault-locked-screen');
  const unlockedContent = document.getElementById('vault-unlocked-content');
  const indicator = document.getElementById('vault-lock-indicator');

  if (!unlockedVaultPassword) {
    lockedScreen.classList.remove('hidden');
    unlockedContent.classList.add('hidden');
    if (indicator) indicator.textContent = '잠김';
    document.getElementById('vault-gate-title').textContent = state.settings.vaultMasterVerifier
      ? '보안 금고 비밀번호 입력'
      : '보안 금고 초기 비밀번호 설정';
    return;
  }

  lockedScreen.classList.add('hidden');
  unlockedContent.classList.remove('hidden');
  if (indicator) indicator.textContent = '열림';

  decryptedVaultItemsCache = [];
  for (const item of state.vaultItems) {
    try {
      const dec = await VaultCrypto.decryptData(item.encryptedPayload, unlockedVaultPassword);
      decryptedVaultItemsCache.push({ id: item.id, createdAt: item.createdAt, ...dec });
    } catch {}
  }

  const grid = document.getElementById('vault-cards-grid');
  grid.innerHTML = '';

  const filtered = decryptedVaultItemsCache.filter(
    (it) => activeVaultCategory === 'all' || it.category === activeVaultCategory
  );

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="text-muted" style="padding:16px 0;">등록된 보안 항목이 없습니다. 우측 상단 [＋ 항목 추가]로 추가하세요.</div>`;
    return;
  }

  const catLabels = {
    account: '계정/비밀번호',
    finance: '금융/계좌',
    apikey: 'API/시크릿',
    doc: '보안 메모'
  };

  for (const item of filtered) {
    const card = document.createElement('div');
    card.className = 'vault-card';
    card.innerHTML = `
      <div class="vault-card-header">
        <span>${catLabels[item.category] || '보안'}</span>
        <button type="button" class="text-btn text-danger" data-del="${item.id}">삭제</button>
      </div>
      <h4 style="font-size:15px;">${escapeHtml(item.title)}</h4>
      ${item.username ? `<div class="text-muted">ID/계좌: <strong>${escapeHtml(item.username)}</strong></div>` : ''}
      ${
        item.secret
          ? `<div class="vault-secret-row">
               <span class="secret-val" data-masked="1">••••••••••••</span>
               <div style="display:flex;gap:6px;">
                 <button type="button" class="text-btn btn-toggle-vis">보기</button>
                 <button type="button" class="text-btn btn-copy-sec">복사</button>
               </div>
             </div>`
          : ''
      }
      ${item.url ? `<div class="text-muted" style="font-size:12px;">${escapeHtml(item.url)}</div>` : ''}
      ${item.notes ? `<pre style="white-space:pre-wrap;font-size:12px;color:var(--text-secondary);background:var(--bg-sidebar);padding:8px;border-radius:4px;">${escapeHtml(item.notes)}</pre>` : ''}
    `;

    const toggleBtn = card.querySelector('.btn-toggle-vis');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const span = card.querySelector('.secret-val');
        const isMasked = span.dataset.masked === '1';
        span.textContent = isMasked ? item.secret : '••••••••••••';
        span.dataset.masked = isMasked ? '0' : '1';
        toggleBtn.textContent = isMasked ? '숨김' : '보기';
      });
    }

    const copyBtn = card.querySelector('.btn-copy-sec');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(item.secret);
        showToast('복사되었습니다.');
      });
    }

    card.querySelector('[data-del]').addEventListener('click', () => {
      state.vaultItems = state.vaultItems.filter((v) => v.id !== item.id);
      scheduleSave();
      renderSecureVaultView();
    });

    grid.appendChild(card);
  }
}

// ============================================================================
// Stopwords & Intelligent Semantic Filtering (Korean & English - Obsidian style)
// ============================================================================
const KOREAN_STOPWORDS = new Set([
  '있는', '있다', '있는지', '없는', '없다', '하는', '한다', '했다', '하고', '하여', '해서', '된다', '됐다',
  '대한', '통해', '위해', '따른', '따라', '관련', '이번', '지난', '최근', '현재', '오늘', '내일', '올해',
  '경우', '대해', '에서', '으로', '에게', '부터', '까지', '보다', '처럼', '만큼', '및', '등', '것', '수',
  '그', '이', '저', '우리', '기자', '뉴스', '사진', '제공', '무단', '배포', '금지', '시간', '오전', '오후',
  '말했다', '밝혔다', '전했다', '이어', '또한', '하지만', '그러나', '그리고', '가장', '다시', '함께', '모두',
  '다른', '어떤', '이런', '그런', '저런', '때문'
]);

const ENGLISH_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'aren',
  'arent', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'couldn', 'couldnt', 'did', 'didn', 'didnt', 'do', 'does', 'doesn', 'doesnt',
  'doing', 'don', 'dont', 'down', 'during', 'each', 'even', 'few', 'for', 'from', 'further', 'had', 'hadn',
  'hadnt', 'has', 'hasn', 'hasnt', 'have', 'haven', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her',
  'here', 'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive',
  'if', 'in', 'into', 'is', 'isn', 'isnt', 'it', 'its', 'itself', 'just', 'let', 'lets', 'like', 'made', 'make',
  'many', 'may', 'me', 'might', 'more', 'most', 'must', 'mustn', 'mustnt', 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'say', 'says', 'said', 'shall', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldn', 'shouldnt',
  'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'time',
  'to', 'too', 'under', 'until', 'up', 'us', 'very', 'was', 'wasn', 'wasnt', 'we', 'wed', 'well', 'were', 'weren',
  'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why',
  'whys', 'with', 'won', 'wont', 'would', 'wouldn', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve',
  'your', 'yours', 'yourself', 'yourselves', 'one', 'two', 'three', 'first', 'second', 'new', 'way', 'get', 'got',
  'still', 'has', 'had', 'see', 'now', 'know', 'come', 'take', 'back', 'part', 'even', 'well', 'high', 'last',
  'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big', 'small', 'next', 'early', 'young', 'important',
  'few', 'public', 'bad', 'same', 'able', 'per', 'via', 'etc', 'inc', 'corp', 'co'
]);

const GENERIC_GRAPH_TAGS = new Set([
  '클리핑', '요약', '웹스크랩', '스크랩', '메모', '노트', '가이드', '일반', '기타', '뉴스', '기사', '링크',
  '유튜브', 'youtube', '영상', '영상요약', '동영상', '비디오', 'video',
  'clip', 'note', 'summary', 'memo', 'news', 'article'
]);

const URL_WEB_STOPWORDS = new Set([
  'http', 'https', 'www', 'com', 'org', 'net', 'gov', 'edu', 'io', 'kr', 'co', 'uk', 'jp',
  'html', 'htm', 'php', 'asp', 'aspx', 'jsp', 'url', 'uri', 'link', 'href', 'src',
  'view', 'index', 'page', 'site', 'post', 'article', 'news', 'media', 'press',
  'image', 'images', 'img', 'photo', 'photos', 'pic', 'pics', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'ref', 'source', 'author', 'title', 'content', 'text', 'comment', 'comments', 'reply',
  'null', 'undefined', 'true', 'false', 'width', 'height', 'style', 'class', 'id', 'div', 'span',
  'edition', 'cnn', 'bbc', 'naver', 'daum', 'google', 'blog', 'feed', 'rss', 'live'
]);

function isMeaningfulTopicTag(tag = '') {
  if (!tag) return false;
  const clean = String(tag).replace(/^#/, '').trim().toLowerCase();
  if (clean.length < 2) return false;
  if (GENERIC_GRAPH_TAGS.has(clean)) return false;
  if (KOREAN_STOPWORDS.has(clean)) return false;
  if (ENGLISH_STOPWORDS.has(clean)) return false;
  if (URL_WEB_STOPWORDS.has(clean)) return false;
  if (/^\d+$/.test(clean)) return false;
  if (/^[a-z]+$/.test(clean) && clean.length < 3) return false;
  return true;
}

function sanitizeExistingNoteTags() {
  let changed = false;
  for (const n of state.notes) {
    if (Array.isArray(n.tags)) {
      const beforeStr = JSON.stringify(n.tags);
      n.tags = n.tags.filter((t) => {
        if (t === '요약' || t === '클리핑' || t === '가이드' || t === '유튜브') return true;
        return isMeaningfulTopicTag(t);
      });
      if (JSON.stringify(n.tags) !== beforeStr) changed = true;
    }
  }
  if (changed) scheduleSave(false);
}

function extractSignificantTitleKeywords(title = '') {
  const words = String(title || '').match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [];
  return words
    .map((w) => w.replace(/(은|는|이|가|을|를|의|에|에서|으로|로|과|와|도|만|부터|까지|에게|한테)$/, ''))
    .filter((w) => {
      const lower = w.toLowerCase();
      if (/^[A-Za-z]+$/.test(w)) {
        return w.length >= 4 && !ENGLISH_STOPWORDS.has(lower);
      }
      return w.length >= 2 && !GENERIC_GRAPH_TAGS.has(w) && !KOREAN_STOPWORDS.has(lower);
    });
}

function getGraphEdgeInfo(noteA, noteB) {
  if (!noteA || !noteB || noteA.id === noteB.id) return { connected: false };

  const aTitle = (noteA.title || '').trim().toLowerCase();
  const bTitle = (noteB.title || '').trim().toLowerCase();
  const aLinks = new Set((noteA.blocks || []).flatMap((blk) => extractWikiLinks(blk.text).map((t) => t.toLowerCase())));
  const bLinks = new Set((noteB.blocks || []).flatMap((blk) => extractWikiLinks(blk.text).map((t) => t.toLowerCase())));

  // 1. Direct [[WikiLink]] reference (Obsidian style - highest fidelity connection)
  if ((bTitle && aLinks.has(bTitle)) || (aTitle && bLinks.has(aTitle))) {
    return { connected: true, type: 'wiki', label: '[[링크]]' };
  }

  // 2. Shared Meaningful Topic Tag (non-generic, non-stopword)
  const aTopicTags = (noteA.tags || []).filter(isMeaningfulTopicTag);
  const bTopicTagsSet = new Set((noteB.tags || []).filter(isMeaningfulTopicTag).map((t) => t.toLowerCase()));
  const sharedTopicTags = aTopicTags.filter((t) => bTopicTagsSet.has(t.toLowerCase()));
  if (sharedTopicTags.length > 0) {
    const displayTag = sharedTopicTags[0].replace(/^#/, '');
    return { connected: true, type: 'tag', label: `#${displayTag}` };
  }

  // 3. Shared Distinctive Topic/Entity Keyword in Titles
  const aKw = extractSignificantTitleKeywords(noteA.title);
  const bKwSet = new Set(extractSignificantTitleKeywords(noteB.title).map((w) => w.toLowerCase()));
  const sharedTitleKw = aKw.filter((w) => bKwSet.has(w.toLowerCase()));
  if (sharedTitleKw.length > 0) {
    return { connected: true, type: 'keyword', label: `주제: ${sharedTitleKw[0]}` };
  }

  return { connected: false };
}

// ============================================================================
// Knowledge Graph Canvas View
// ============================================================================
let graphNodePositions = [];
let graphViewMode = 'local'; // 'local' (선택 문서 중심) | 'global' (전체 문서 보기)
let graphCenterNoteId = null;

function renderKnowledgeGraph() {
  sanitizeExistingNoteTags();
  const canvas = document.getElementById('knowledge-graph-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const notes = state.notes.filter((n) => !n.trashed);
  if (notes.length === 0) return;

  // Ensure graphCenterNoteId points to a valid note (prefer activeNoteId)
  if (!graphCenterNoteId || !notes.some((n) => n.id === graphCenterNoteId)) {
    graphCenterNoteId = activeNoteId && notes.some((n) => n.id === activeNoteId) ? activeNoteId : notes[0].id;
  }

  // Update controls bar in #workspace-graph-view
  const localBtn = document.getElementById('btn-graph-mode-local');
  const globalBtn = document.getElementById('btn-graph-mode-global');
  const centerSelect = document.getElementById('graph-center-note-select');
  const subtitleEl = document.getElementById('graph-view-subtitle');

  if (localBtn && globalBtn) {
    localBtn.classList.toggle('active', graphViewMode === 'local');
    globalBtn.classList.toggle('active', graphViewMode === 'global');
  }
  if (centerSelect) {
    centerSelect.innerHTML = notes
      .map(
        (n) =>
          `<option value="${n.id}" ${n.id === graphCenterNoteId ? 'selected' : ''}>기준 문서: ${escapeHtml((n.title || '제목 없음').slice(0, 32))}</option>`
      )
      .join('');
  }

  const isDark = state.settings.theme === 'dark';
  const cx = w / 2;
  const cy = h / 2;

  if (graphViewMode === 'local') {
    const centerNote = notes.find((n) => n.id === graphCenterNoteId) || notes[0];
    const relatedEntries = [];
    for (const other of notes) {
      if (other.id === centerNote.id) continue;
      const edge = getGraphEdgeInfo(centerNote, other);
      if (edge.connected) {
        relatedEntries.push({ note: other, edge });
      }
    }

    if (subtitleEl) {
      subtitleEl.textContent =
        relatedEntries.length > 0
          ? `'${(centerNote.title || '제목 없음').slice(0, 28)}' 문서와 직접 연관된 문서 ${relatedEntries.length}개만 표시 중입니다. (노드를 클릭하면 해당 문서가 바로 열립니다.)`
          : `'${(centerNote.title || '제목 없음').slice(0, 28)}' 문서와 연관된 다른 문서가 없습니다.`;
    }

    const radius = Math.min(w, h) * 0.33;
    graphNodePositions = [
      {
        note: centerNote,
        x: cx,
        y: cy,
        r: 21,
        isCenter: true
      }
    ];

    relatedEntries.forEach((entry, i) => {
      const angle = (2 * Math.PI * i) / relatedEntries.length - Math.PI / 2;
      const nx = cx + radius * Math.cos(angle);
      const ny = cy + radius * Math.sin(angle);
      graphNodePositions.push({
        note: entry.note,
        x: nx,
        y: ny,
        r: 14,
        isCenter: false,
        edge: entry.edge
      });
    });

    // Draw edges from centerNote to related notes ( plus any secondary edges between related notes )
    for (let i = 1; i < graphNodePositions.length; i++) {
      const relNode = graphNodePositions[i];
      const edge = relNode.edge;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(relNode.x, relNode.y);
      ctx.strokeStyle =
        edge.type === 'wiki'
          ? isDark ? 'rgba(255,255,255,0.75)' : 'rgba(20,20,20,0.7)'
          : isDark ? 'rgba(210,210,210,0.45)' : 'rgba(70,70,70,0.4)';
      ctx.lineWidth = edge.type === 'wiki' ? 2.4 : 1.5;
      ctx.stroke();

      const mx = (cx + relNode.x) / 2;
      const my = (cy + relNode.y) / 2;
      ctx.fillStyle = isDark ? 'rgba(225,225,225,0.85)' : 'rgba(70,70,70,0.88)';
      ctx.font = '500 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(edge.label, mx, my - 6);
    }

    // Draw nodes
    for (const node of graphNodePositions) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = node.isCenter
        ? isDark ? '#ffffff' : '#1f1f1f'
        : isDark ? '#666666' : '#888888';
      ctx.fill();

      ctx.fillStyle = isDark ? '#f0f0f0' : '#1f1f1f';
      ctx.font = node.isCenter ? '700 13.5px sans-serif' : '500 12px sans-serif';
      ctx.textAlign = 'center';
      const label = (node.note.title || '제목 없음').slice(0, 22);
      ctx.fillText(node.isCenter ? `[기준] ${label}` : label, node.x, node.y + node.r + 18);
    }

    if (relatedEntries.length === 0) {
      ctx.fillStyle = isDark ? 'rgba(180,180,180,0.8)' : 'rgba(110,110,110,0.85)';
      ctx.font = '400 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        '이 문서와 연결된 연관 문서가 아직 없습니다. (본문에 [[문서 제목]]을 쓰거나 공통 #태그를 추가하면 연결됩니다)',
        cx,
        cy + 75
      );
    }
    return;
  }

  // Global Mode ('global'): Show all documents
  if (subtitleEl) {
    subtitleEl.textContent =
      '전체 문서의 연결 관계를 한눈에 보여줍니다. 특정 문서와 연관된 문서만 집중해서 보려면 우측 상단 [선택 문서 중심]을 누르세요.';
  }

  const radius = Math.min(w, h) * 0.34;
  graphNodePositions = notes.map((n, i) => {
    const angle = (2 * Math.PI * i) / notes.length - Math.PI / 2;
    return {
      note: n,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      r: n.id === graphCenterNoteId ? 18 : 13,
      isCenter: n.id === graphCenterNoteId
    };
  });

  for (let i = 0; i < graphNodePositions.length; i++) {
    for (let j = i + 1; j < graphNodePositions.length; j++) {
      const a = graphNodePositions[i];
      const b = graphNodePositions[j];
      const edge = getGraphEdgeInfo(a.note, b.note);

      if (edge.connected) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle =
          edge.type === 'wiki'
            ? isDark ? 'rgba(255,255,255,0.65)' : 'rgba(20,20,20,0.6)'
            : isDark ? 'rgba(200,200,200,0.32)' : 'rgba(80,80,80,0.28)';
        ctx.lineWidth = edge.type === 'wiki' ? 2.2 : 1.2;
        ctx.stroke();

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = isDark ? 'rgba(210,210,210,0.75)' : 'rgba(90,90,90,0.8)';
        ctx.font = '400 10.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label, mx, my - 4);
      }
    }
  }

  for (const node of graphNodePositions) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = node.isCenter ? (isDark ? '#ffffff' : '#1f1f1f') : (isDark ? '#555555' : '#999999');
    ctx.fill();

    ctx.fillStyle = isDark ? '#ebebeb' : '#1f1f1f';
    ctx.font = '500 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((node.note.title || '제목 없음').slice(0, 20), node.x, node.y + node.r + 16);
  }
}

// ============================================================================
// Smart Readability Web Clipper Engine
// ============================================================================
const ARTICLE_BODY_SELECTORS = [
  '#dic_area',                   // 네이버 뉴스
  '#newsct_article',             // 네이버 뉴스 (모바일/신형)
  '#articeBody',                 // 네이버 연예/스포츠
  '.newsct_body',
  '.se-main-container',          // 네이버 블로그 SmartEditor ONE
  '#postViewArea',               // 네이버 블로그 구형
  '.se_component_wrap',
  '.article_view',               // 다음(Daum) 뉴스 / 브런치
  '.news_view',
  '.wrap_body',                  // 브런치(Brunch)
  '.tt_article_useless_p_margin',// 티스토리(Tistory)
  '.contents_style',             // 티스토리 신형
  '.area_view',
  '.entry-content',              // 워드프레스 / 일반 블로그
  '.post-content',
  '.article-body',
  '.article_body',
  '.markdown-body',              // GitHub / 기술 문서
  '#mw-content-text .mw-parser-output', // 위키백과
  '[itemprop="articleBody"]',
  'article',
  'main',
  '[role="main"]'
];

const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'form', 'button',
  'nav', 'footer', 'header', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[role="complementary"]',
  '.gnb', '.lnb', '.snb', '.sidebar', '.widget', '.breadcrumb',
  '.comment', '.comments', '#comments', '.reply', '.replies',
  '.ad', '.ads', '.advertisement', '.banner', '.sponsor',
  '.share', '.social', '.sns', '.related', '.recommend', '.popular',
  '.copyright', '.byline', '.reporter_area', '.journalistcard', '.media_end_linked',
  '.media_end_head_more', '.media_end_categorize', '.media_end_head_info', '.media_end_head_tool',
  '#cbox_module', '#article_bottom', '#right_content'
].join(', ');

function findBestArticleContainer(doc) {
  // 1. Try known high-precision article body selectors first
  for (const sel of ARTICLE_BODY_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el) {
      const textLen = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
      if (textLen >= 80) return el;
    }
  }

  // 2. Fallback: Readability Content-Density Scoring across candidate containers
  const candidates = doc.querySelectorAll('article, main, section, div, td');
  let bestNode = doc.body;
  let bestScore = -1;

  candidates.forEach((node) => {
    const clsAndId = `${node.className || ''} ${node.id || ''}`.toLowerCase();
    if (/(nav|menu|footer|header|sidebar|comment|reply|widget|banner|popup|modal|login|gnb|lnb)/.test(clsAndId)) {
      return;
    }

    const totalText = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (totalText.length < 100) return;

    // Calculate link density to reject menus / article lists
    let linkTextLen = 0;
    node.querySelectorAll('a').forEach((a) => {
      linkTextLen += (a.textContent || '').trim().length;
    });
    const linkDensity = linkTextLen / Math.max(1, totalText.length);
    if (linkDensity > 0.5) return;

    // Count sentences (Korean '다.', '요.' and general periods/commas)
    const sentenceMatches = totalText.match(/(다\.|요\.|죠\.|\.\s|,)/g);
    const sentenceCount = sentenceMatches ? sentenceMatches.length : 0;

    // Direct text / paragraph children bonus
    const directParaCount = node.querySelectorAll(':scope > p, :scope > div, :scope > br').length;

    const score =
      (totalText.length * (1 - linkDensity)) +
      (sentenceCount * 35) +
      (directParaCount * 20);

    if (score > bestScore) {
      bestScore = score;
      bestNode = node;
    }
  });

  return bestNode || doc.body;
}

/**
 * AI 답변(Gemini, ChatGPT 등) 및 서식 있는 텍스트를 노션 스타일 블록으로 변환하는 스마트 파서
 */
function parseStructuredTextToBlocks(rawText, rawHtml = '') {
  let sourceText = rawText || '';

  // HTML 클립보드에 볼드/기울임/코드 태그가 있다면 마크다운 기호로 보존
  if (rawHtml && typeof document !== 'undefined' && !sourceText.includes('**')) {
    try {
      const temp = document.createElement('div');
      temp.innerHTML = rawHtml;
      temp.querySelectorAll('strong, b').forEach((el) => {
        el.textContent = `**${el.textContent.trim()}**`;
      });
      temp.querySelectorAll('em, i').forEach((el) => {
        el.textContent = `*${el.textContent.trim()}*`;
      });
      temp.querySelectorAll('code').forEach((el) => {
        el.textContent = `\`${el.textContent.trim()}\``;
      });
      const extracted = temp.innerText || '';
      if (extracted.includes('\n')) {
        sourceText = extracted;
      }
    } catch (_) {}
  }

  const blocks = [];
  const lines = sourceText.split(/\r?\n/);

  for (let rawLine of lines) {
    if (!rawLine.trim()) continue; // 빈 줄 건너뛰기

    // 1. 공백 기반 들여쓰기 감지 (2스페이스 또는 1탭 당 1단계, 최대 4단계)
    const indentMatch = rawLine.match(/^([ \t]+)/);
    let indent = 0;
    if (indentMatch) {
      const sp = indentMatch[1].replace(/\t/g, '  ').length;
      indent = Math.min(Math.floor(sp / 2), 4);
    }

    let line = rawLine.trim();

    // 2. 제목 (Heading): 동그라미 번호(①, ②) 또는 마크다운 #
    if (/^[①-⑳]/.test(line)) {
      blocks.push({ id: uid('b'), type: 'h2', text: line, indent: 0 });
      continue;
    }
    if (/^#\s+(.+)$/.test(line)) {
      blocks.push({ id: uid('b'), type: 'h1', text: line.replace(/^#\s+/, ''), indent: 0 });
      continue;
    }
    if (/^##\s+(.+)$/.test(line)) {
      blocks.push({ id: uid('b'), type: 'h2', text: line.replace(/^##\s+/, ''), indent: 0 });
      continue;
    }
    if (/^###\s+(.+)$/.test(line)) {
      blocks.push({ id: uid('b'), type: 'h3', text: line.replace(/^###\s+/, ''), indent: 0 });
      continue;
    }

    // 3. 글머리 기호(Bullet) 목록: ◦, •, *, -, ·, ▪
    const bulletMatch = line.match(/^[◦•*·▪\-]\s+(.*)$/) || line.match(/^[◦•]\s*(.*)$/);
    if (bulletMatch) {
      blocks.push({ id: uid('b'), type: 'bullet', text: bulletMatch[1].trim(), indent });
      continue;
    }

    // 4. 할 일 체크박스 (Todo)
    const todoMatch = line.match(/^[-*]?\s*\[([ xX])\]\s+(.*)$/);
    if (todoMatch) {
      blocks.push({
        id: uid('b'),
        type: 'todo',
        text: todoMatch[2].trim(),
        checked: todoMatch[1].toLowerCase() === 'x',
        indent
      });
      continue;
    }

    // 5. 번호 매기기 목록 (Numbered list)
    const numMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      blocks.push({ id: uid('b'), type: 'number', text: numMatch[2].trim(), indent });
      continue;
    }

    // 6. 인용구 / 콜아웃 (Quote / Callout)
    if (line.startsWith('> ')) {
      blocks.push({ id: uid('b'), type: 'callout', text: line.slice(2).trim(), indent });
      continue;
    }

    // 7. 가로 구분선 (Divider)
    if (/^---+$/.test(line) || /^___+$/.test(line)) {
      blocks.push({ id: uid('b'), type: 'divider', text: '', indent: 0 });
      continue;
    }

    // 8. 일반 본문 문단 (Paragraph)
    blocks.push({ id: uid('b'), type: 'p', text: line, indent });
  }

  return blocks;
}

function parseMarkdownToBlocks(mdText = '', sourceUrl = '') {
  const blocks = [];
  const lines = mdText.split(/\r?\n/);
  let extractedTitle = '';
  let publishedDate = '';
  let naverInputDate = '';
  let naverModDate = '';

  for (const rawLine of lines) {
    const l = rawLine.trim();
    if (l.startsWith('Title: ')) {
      extractedTitle = l.slice(7).trim();
    } else if (l.startsWith('Published Time: ')) {
      const rawIso = l.slice(16).trim();
      try {
        const d = new Date(rawIso);
        if (!isNaN(d.getTime())) {
          publishedDate = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
      } catch {}
    }
  }

  const cleanTitleForMatch = (extractedTitle || '').replace(/[“"”'‘`\[\]\s]/g, '').toLowerCase();
  let inBody = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('Title: ') || line.startsWith('URL Source: ') || line.startsWith('Markdown Content:')) continue;

    // Extract Naver publish and modification timestamps before filtering boilerplate
    const mInput = line.match(/^(_입력_|입력)\s*(20\d\d[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2}.*)/i);
    if (mInput) {
      naverInputDate = mInput[2].replace(/^_+|_+$/g, '').trim();
      continue;
    }
    const mMod = line.match(/^(_수정_|수정)\s*(20\d\d[.\-/]\s*\d{1,2}[.\-/]\s*\d{1,2}.*)/i);
    if (mMod) {
      naverModDate = mMod[2].replace(/^_+|_+$/g, '').trim();
      continue;
    }

    // Filter out portal noise, profile links, and notification headers
    if (/(사용자\s*링크|프로필\s*사진|내정보\s*보기|로그아웃|로그인|네이버ID|보안설정|내인증서|페이포인트|알림\s*새\s*창|전체\s*알림|알림을\s*모두\s*삭제|읽은\s*알림|레이어\s*닫기|언론사\s*구독|구독해지)/i.test(line)) continue;
    if (/(office_logo|favicon|naverProfile|blob:http|nid\.naver\.com|notify\.naver\.com|point\.pay\.naver\.com)/i.test(line)) continue;
    if (/^(Ad\s*Feedback|Advertisement|Follow\s+[A-Za-z]+|Sponsored)/i.test(line)) continue;

    // If not yet in body, wait until we reach the genuine article headline or first substantial paragraph
    if (!inBody) {
      const cleanL = line.replace(/^#+\s*/, '').replace(/[“"”'‘`\[\]\s]/g, '').toLowerCase();
      if (cleanTitleForMatch && cleanTitleForMatch.length >= 5 && (cleanL.includes(cleanTitleForMatch.slice(0, 8)) || cleanTitleForMatch.includes(cleanL.slice(0, 8)))) {
        inBody = true;
        continue;
      }
      // Fallback: If title not found in headings, look for the first long coherent prose sentence
      if (line.length >= 40 && /(다\.|니다\.|했다\.|된다\.|이다\.|\.\s*$)/.test(line) && !line.includes('http') && !line.includes('javascript')) {
        inBody = true;
      } else {
        // Skip all pre-article headers, avatars, and navigation bars
        continue;
      }
    }

    // 1. Stop parsing when reaching copyright, comment sections, or recommended news footers
    if (inBody && /(Copyright\s*ⓒ|All\s*rights\s*reserved|무단\s*전재|기사\s*섹션\s*분류|댓글\s*\(\d+\)|이\s*시각\s*주요뉴스|가장\s*많이\s*본\s*뉴스|랭킹\s*뉴스|관련기사|인기기사|포토뉴스|자동\s*추천)/i.test(line)) {
      break;
    }

    // 2. Filter out navigation buttons, menus, and boilerplate links before or inside article content
    if (/^((\[.*?\]\(.*?\)\s*)+)$/.test(line) && !line.includes('Image')) continue;
    if (/^(\*|\-)\s*\[.*\]\(.*\)$/.test(line) && !line.includes('Image')) continue;
    if (/^(_입력_|_수정_|_PICK_|_안내_|_성별_|_말하기 속도_|_기자_)/.test(line)) continue;
    if (/^(구독|닫기|본문듣기|글자크기|\*\*글자크기\*\*|인쇄하기|SNS\s*보내기|기사\s*원문|\d+\s*반응|언론사별\s*바로가기|이동\s*통신망|텍스트\s*음성\s*변환|본문\s*바로가기|이전\s*페이지)/i.test(line)) continue;

    // 3. Image Detection: Always capture real images (never downgrade to plain text links)
    const imgMatch = line.match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
    if (imgMatch) {
      blocks.push({ id: uid('b'), type: 'image', dataUrl: imgMatch[2], text: imgMatch[1] || '' });
      continue;
    }

    // 4. Headline & Subheading detection
    if (line.startsWith('#')) {
      const cleanH = line.replace(/^#+\s*/, '').replace(/\[|\]/g, '').trim();
      const cleanT = (extractedTitle || '').replace(/\[|\]/g, '').trim();
      if (cleanT && (cleanH.includes(cleanT.slice(0, 8)) || cleanT.includes(cleanH.slice(0, 8)))) {
        continue;
      }
      blocks.push({ id: uid('b'), type: 'h3', text: cleanH });
      continue;
    }

    // 5. Genuine content: Substantial sentences, bold lead lines, quotes
    if (line.length >= 10 || line.startsWith('**') || line.startsWith('> ')) {
      if (line.startsWith('> ')) {
        blocks.push({ id: uid('b'), type: 'callout', text: line.slice(2).trim() });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        blocks.push({ id: uid('b'), type: 'bullet', text: line.slice(2).trim() });
      } else {
        blocks.push({ id: uid('b'), type: 'p', text: line });
      }
    }
  }

  // Fallback: If strict parser found 0 blocks, parse conservatively with image support
  if (blocks.filter((b) => b.type !== 'callout').length === 0) {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('Title: ') || line.startsWith('URL Source: ') || line.startsWith('Markdown Content:')) continue;
      if (/^(구독|닫기|본문듣기|글자크기|인쇄하기|SNS 보내기|이전 페이지|본문 바로가기)/i.test(line)) continue;
      const imgMatch = line.match(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
      if (imgMatch) {
        blocks.push({ id: uid('b'), type: 'image', dataUrl: imgMatch[2], text: imgMatch[1] || '' });
      } else if (line.length >= 18) {
        blocks.push({ id: uid('b'), type: 'p', text: line });
      }
    }
  }

  if (naverInputDate) {
    publishedDate = naverInputDate + (naverModDate ? ` (수정: ${naverModDate})` : '');
  }

  // Prepend source and published date callout if sourceUrl is provided
  if (sourceUrl) {
    const dateSuffix = publishedDate ? ` · 원문 게시: ${publishedDate}` : '';
    blocks.unshift({ id: uid('b'), type: 'callout', text: `출처: ${sourceUrl}${dateSuffix}` });
  }

  return { title: extractedTitle, publishedDate, blocks: blocks.slice(0, 200) };
}

function extractBestArticleTitle(doc) {
  // 1. OpenGraph / Twitter meta title is the most reliable article headline on news & blogs
  const ogTitle = (
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
    ''
  ).replace(/\s+/g, ' ').trim();

  // 2. Specific article headline selectors evaluated in strict priority order (never matching header logos)
  const headlineSelectors = [
    '#title_area',
    '.media_end_head_headline',
    '.se-title-text',
    '.tit_view',
    '.article_headline',
    '.news_title',
    'article h1',
    'main h1'
  ];
  let domHeadline = '';
  for (const sel of headlineSelectors) {
    const el = doc.querySelector(sel);
    const txt = (el?.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt.length >= 6) {
      domHeadline = txt;
      break;
    }
  }

  // 3. Document <title> (cleaned of trailing " : 네이버 뉴스", " - TV조선" etc. if ogTitle is absent)
  const docTitle = (doc.title || '').replace(/\s+/g, ' ').trim();

  if (domHeadline && domHeadline.length >= ogTitle.length) return domHeadline;
  if (ogTitle && ogTitle.length >= 4) return ogTitle;
  if (domHeadline) return domHeadline;
  if (docTitle) return docTitle;

  // 4. Last resort: h1 outside header/nav
  for (const h1 of doc.querySelectorAll('h1')) {
    if (h1.closest('header, nav, .header, .gnb, .logo')) continue;
    const txt = (h1.textContent || '').replace(/\s+/g, ' ').trim();
    if (txt.length >= 6) return txt;
  }
  return '';
}

function parseHtmlToBlocks(htmlString, sourceUrl = '', readerMarkdown = '') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const extractedTitle = extractBestArticleTitle(doc);

  // Locate best article body container BEFORE stripping everything
  const root = findBestArticleContainer(doc);

  // Remove noise inside the chosen container
  root.querySelectorAll(NOISE_SELECTORS).forEach((el) => el.remove());

  // Convert <br> tags into newline markers so <div>문단1<br><br>문단2</div> splits cleanly
  root.querySelectorAll('br').forEach((br) => {
    br.replaceWith('\n');
  });

  let publishedDate = '';
  const pubMeta =
    doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="pubdate"]')?.getAttribute('content') ||
    doc.querySelector('.media_end_head_info_datestamp_time')?.textContent ||
    '';
  if (pubMeta) {
    try {
      const d = new Date(pubMeta);
      if (!isNaN(d.getTime())) {
        publishedDate = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } else {
        publishedDate = pubMeta.trim();
      }
    } catch {
      publishedDate = pubMeta.trim();
    }
  }

  const blocks = [];
  if (sourceUrl) {
    const dateSuffix = publishedDate ? ` · 원문 게시: ${publishedDate}` : '';
    blocks.push({ id: uid('b'), type: 'callout', text: `출처: ${sourceUrl}${dateSuffix}` });
  }

  const seenTexts = new Set();
  const pushCleanParagraphs = (rawText, type = 'p') => {
    const parts = String(rawText || '')
      .split(/\n+/)
      .map((s) => s.replace(/[ \t]+/g, ' ').trim())
      .filter((s) => s.length >= 2);

    for (const part of parts) {
      if (seenTexts.has(part)) continue;
      seenTexts.add(part);
      blocks.push({ id: uid('b'), type, text: part });
    }
  };

  function walkNode(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.nodeValue.replace(/[ \t]+/g, ' ').trim();
      if (txt.length >= 20) pushCleanParagraphs(txt, 'p');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    // Images
    if (tag === 'img') {
      const rawSrc =
        node.getAttribute('data-src') ||
        node.getAttribute('data-lazy-src') ||
        node.getAttribute('data-original') ||
        node.getAttribute('src') || '';
      if (rawSrc && !rawSrc.startsWith('data:image/gif') && !rawSrc.includes('1x1')) {
        try {
          const absUrl = sourceUrl ? new URL(rawSrc, sourceUrl).toString() : rawSrc;
          if (!seenTexts.has(absUrl)) {
            seenTexts.add(absUrl);
            blocks.push({
              id: uid('b'),
              type: 'image',
              dataUrl: absUrl,
              text: (node.getAttribute('alt') || '').trim()
            });
          }
        } catch {}
      }
      return;
    }

    // Headings
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt.length >= 2) {
        pushCleanParagraphs(txt, tag === 'h1' ? 'h1' : tag === 'h2' ? 'h2' : 'h3');
      }
      return;
    }

    // Code block
    if (tag === 'pre') {
      const txt = (node.textContent || '').trim();
      if (txt) blocks.push({ id: uid('b'), type: 'code', text: txt });
      return;
    }

    // Blockquote
    if (tag === 'blockquote') {
      const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt) pushCleanParagraphs(txt, 'callout');
      return;
    }

    // Table
    if (tag === 'table') {
      const rows = [];
      node.querySelectorAll('tr').forEach((tr) => {
        const rowCells = [];
        tr.querySelectorAll('th, td').forEach((cell) => {
          rowCells.push((cell.textContent || '').replace(/\s+/g, ' ').trim());
        });
        if (rowCells.some(Boolean)) rows.push(rowCells);
      });
      if (rows.length > 0) {
        blocks.push({ id: uid('b'), type: 'table', rows: rows.slice(0, 30) });
      }
      return;
    }

    // List item
    if (tag === 'li') {
      const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt.length >= 2) pushCleanParagraphs(txt, 'bullet');
      return;
    }

    // Leaf-like Paragraph or Div/Section without nested block containers
    const hasChildBlockElements = node.querySelector('p, div, section, article, ul, ol, table, pre, blockquote, h1, h2, h3, h4, img');
    if (tag === 'p' || !hasChildBlockElements) {
      // Check if it contains images first
      node.querySelectorAll('img').forEach((img) => walkNode(img));
      const txt = (node.textContent || '').trim();
      if (txt.length >= 2) {
        pushCleanParagraphs(txt, 'p');
      }
      return;
    }

    // Otherwise recurse into child nodes in exact DOM order
    node.childNodes.forEach((child) => walkNode(child));
  }

  walkNode(root);

  // If extracted blocks are too sparse and readerMarkdown fallback is available, use readerMarkdown
  const bodyBlocksCount = blocks.filter((b) => b.type !== 'callout').length;
  if (bodyBlocksCount < 2 && readerMarkdown && readerMarkdown.length > 100) {
    return parseMarkdownToBlocks(readerMarkdown, sourceUrl);
  }

  // Final fallback: split root textContent by lines
  if (bodyBlocksCount === 0) {
    pushCleanParagraphs(root.textContent || doc.body?.textContent || '', 'p');
  }

  return { title: extractedTitle, publishedDate, blocks: blocks.slice(0, 200) };
}

/**
 * Smart Extractive Summarizer & Keyword Organizer
 * Extracts 3~5 key summary sentences and top keyword tags from parsed article blocks,
 * and constructs a structured Notion-style summary + full content note.
 */
function stripExistingSummaryBlocks(rawBlocks = []) {
  const cleaned = [];
  let skippingSummary = false;

  for (let i = 0; i < rawBlocks.length; i++) {
    const b = rawBlocks[i];
    const txt = (b.text || '').trim();

    if (!skippingSummary && (b.type === 'h1' || b.type === 'h2' || b.type === 'h3') && (txt === '핵심 요약' || txt === 'AI 핵심 요약')) {
      skippingSummary = true;
      continue;
    }

    if (skippingSummary) {
      if (b.type === 'bullet' || (b.type === 'callout' && txt.startsWith('핵심 요지:'))) continue;
      if (b.type === 'divider') {
        const nextB = rawBlocks[i + 1];
        if (nextB && (nextB.type === 'h2' || nextB.type === 'h3') && (nextB.text || '').trim() === '본문 내용') {
          i += 1;
        }
        skippingSummary = false;
        continue;
      }
      if ((b.type === 'h2' || b.type === 'h3') && txt === '본문 내용') {
        skippingSummary = false;
        continue;
      }
      skippingSummary = false;
    }

    cleaned.push(b);
  }
  return cleaned;
}

/**
 * Checks if a note belongs to a Security Folder or is Encrypted.
 * Security-folder notes and encrypted notes NEVER allow public AI summarization.
 */
function isNoteRestrictedFromPublicAI(note) {
  if (!note) return true;
  if (note.isEncrypted) return true;
  if (activeNav === 'vault') return true;
  const folder = state.folders.find((f) => f.id === note.folderId);
  const folderName = (folder?.name || '').trim();
  if (note.folderId === 'f_security' || /보안|금고|비밀|기밀|secret|private|vault/i.test(folderName)) {
    return true;
  }
  if ((note.tags || []).some((t) => /보안|금고|비밀|기밀/i.test(t))) {
    return true;
  }
  return false;
}

/**
 * Masks sensitive personal/credential information into [비공개_정보] ON-DEVICE
 * before any text leaves the device for AI summarization.
 */
function maskSensitiveTextForAI(rawText = '') {
  let maskCount = 0;
  const countReplace = (str, regex, replacement = '[비공개_정보]') =>
    str.replace(regex, () => {
      maskCount += 1;
      return replacement;
    });

  let text = String(rawText || '');
  // 1. Resident Registration Number (주민등록번호)
  text = countReplace(text, /\b\d{6}\s*[-~]\s*[1-4]\d{6}\b/g);
  // 2. Credit Card / Long Account Numbers (카드번호 / 계좌번호 패턴)
  text = countReplace(text, /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/g);
  text = countReplace(text, /\b\d{3,6}-\d{2,6}-\d{4,7}\b/g);
  // 3. Phone Numbers (휴대폰 및 일반 전화번호)
  text = countReplace(text, /\b01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}\b/g);
  text = countReplace(text, /\b0\d{1,2}[-\s.]\d{3,4}[-\s.]\d{4}\b/g);
  // 4. Email Addresses (이메일 주소)
  text = countReplace(text, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g);
  // 5. Explicit Passwords / API Keys / Pins (비밀번호, 패스워드, 시크릿 키, 계좌, 카드 등 키워드 뒤의 값)
  text = countReplace(
    text,
    /((?:비밀번호|패스워드|암호|핀번호|계좌번호|카드번호|시크릿|토큰|password|passwd|pwd|secret|api[_\s-]?key|token)\s*[:=：]\s*)([^\s,\n]+)/gi,
    '$1[비공개_정보]'
  );

  return { maskedText: text, maskCount };
}

function prepareSafeNotePayloadForAI(title = '', blocks = []) {
  let totalMasked = 0;
  const titleRes = maskSensitiveTextForAI(title);
  totalMasked += titleRes.maskCount;

  const lines = [];
  for (const b of blocks) {
    // Completely exclude 'secret' blocks from external transmission
    if (b.type === 'secret') {
      totalMasked += 1;
      continue;
    }
    if (b.type === 'image' || b.type === 'divider') continue;
    if (b.type === 'callout' && (b.text || '').startsWith('출처:')) continue;

    const raw = b.type === 'toggle' ? `${b.text || ''}\n${b.details || ''}` : (b.text || '');
    if (!raw.trim()) continue;
    const res = maskSensitiveTextForAI(raw);
    totalMasked += res.maskCount;
    const prefix = b.type === 'h1' || b.type === 'h2' || b.type === 'h3' ? '[소제목] ' : b.type === 'todo' ? '[할일] ' : '';
    lines.push(`${prefix}${res.maskedText.trim()}`);
  }

  return {
    safeTitle: titleRes.maskedText,
    safeBody: lines.join('\n'),
    totalMasked
  };
}

/**
 * Upgraded 4-Rule Offline Extractive Summarizer (100% On-Device, Zero External Transmission)
 * 1) Filters out short/incomplete fragment lines and boilerplate
 * 2) Divides document into 3 zones (Intro / Body / Conclusion) to prevent top-only clustering
 * 3) Boosts sentences with Korean discourse/conclusion markers ("따라서", "핵심은", "결론적으로", etc.)
 * 4) Aggregates subheadings (h1/h2/h3) and action items (todo) into a structured summary
 */
function summarizeExtractedArticle(title = '', rawBlocks = [], sourceUrl = '') {
  const strippedBlocks = stripExistingSummaryBlocks(rawBlocks);
  const bodyBlocks = strippedBlocks.filter(
    (b) => !(b.type === 'callout' && (b.text || '').startsWith('출처:'))
  );

  // Extract subheadings & todo action items for structural summary (Rule 4)
  const subheadings = [];
  const actionTodos = [];
  bodyBlocks.forEach((b) => {
    const txt = (b.text || '').replace(/\s+/g, ' ').trim();
    if (!txt) return;
    if ((b.type === 'h1' || b.type === 'h2' || b.type === 'h3') && txt.length >= 2 && txt.length <= 50) {
      if (!subheadings.includes(txt)) subheadings.push(txt);
    } else if (b.type === 'todo' && !b.checked && txt.length >= 2) {
      if (actionTodos.length < 2) actionTodos.push(txt);
    }
  });

  // Collect candidate sentences in original article/note order (Rule 1)
  const collectCandidates = (minLen) => {
    const list = [];
    const seen = new Set();
    bodyBlocks.forEach((b) => {
      if (b.type === 'image' || b.type === 'divider' || b.type === 'code' || b.type === 'table') return;
      const combinedText = b.type === 'toggle'
        ? `${b.text || ''}\n${b.details || ''}`
        : (b.text || '');
      const lines = combinedText.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

      for (const line of lines) {
        if ((b.type === 'h1' || b.type === 'h2' || b.type === 'h3') && line.length < 28 && minLen >= 10) continue;
        const parts = line
          .split(/(?<=[다요죠음함됨임]\.)\s*|(?<=[.!?])\s+/)
          .map((s) => s.replace(/^[•\-*]\s*/, '').trim())
          .filter(Boolean);

        for (let s of parts) {
          if (s.length < minLen) continue;
          if (s.length > 240) s = `${s.slice(0, 220).trim()}...`;
          if (/(무단\s*전재|재배포|금지|기자\s*=|특파원|copyright|ⓒ|제보|구독|좋아요|클릭|사진\s*=|출처\s*:)/i.test(s)) continue;
          if (seen.has(s)) continue;
          seen.add(s);
          list.push(s);
        }
      }
    });
    return list;
  };

  // Rule 1: Require complete sentences (>= 22 chars) first, fallback if note is short
  let candidateSentences = collectCandidates(22);
  if (candidateSentences.length < 3) {
    candidateSentences = collectCandidates(10);
  }
  if (candidateSentences.length === 0) {
    candidateSentences = collectCandidates(2);
  }

  // Tokenize words for frequency & keyword extraction (stripping URLs & Web noise)
  const cleanStrForTokens = (str) =>
    String(str || '')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/www\.\S+/gi, ' ')
      .replace(/[a-zA-Z0-9_-]+\.(com|org|net|gov|edu|io|kr|co|html|php)/gi, ' ');

  const tokenize = (str) =>
    (cleanStrForTokens(str).match(/[가-힣]{2,}|[A-Za-z]{3,}/g) || [])
      .map((w) => w.replace(/(은|는|이|가|을|를|의|에|에서|으로|로|과|와|도|만|부터|까지|에게|한테)$/, ''))
      .filter((w) => isMeaningfulTopicTag(w.toLowerCase()));

  const wordFreq = new Map();
  const titleWords = new Set(tokenize(title));
  const headingWords = new Set(subheadings.flatMap((h) => tokenize(h)));

  for (const tw of titleWords) {
    wordFreq.set(tw, (wordFreq.get(tw) || 0) + 4);
  }
  for (const hw of headingWords) {
    wordFreq.set(hw, (wordFreq.get(hw) || 0) + 2.5);
  }
  for (const s of candidateSentences) {
    for (const w of tokenize(s)) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
  }

  // Top 3 automatic keyword tags (strictly validated topic keywords, non-stopword)
  const autoTags = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter(isMeaningfulTopicTag)
    .slice(0, 3);

  // Rule 3: Korean Discourse & Conclusion Marker Bonus
  const CONCLUSION_MARKER_REGEX = /(핵심은|중요한\s*것은|중요한\s*점은|결론적으로|따라서|요약하면|정리하면|결국|즉\s|,?\s*특히|무엇보다|주목할|밝혔다|발표했다|나타났다|확인됐다|결정했다|전망이다|예정이다|계획이다|필요하다|해야\s*한다)/;
  const COMPLETE_ENDING_REGEX = /(다\.|요\.|음\.|함\.|됨\.|임\.|니다\.)$/;

  const totalSentCount = candidateSentences.length;

  const scored = candidateSentences.map((sent, idx) => {
    const words = tokenize(sent);
    const uniqueWords = new Set(words);
    let kwScore = 0;
    let titleOverlap = 0;
    for (const w of uniqueWords) {
      kwScore += wordFreq.get(w) || 0;
      if (titleWords.has(w)) titleOverlap += 1;
    }
    const normKwScore = kwScore / Math.max(3.5, Math.sqrt(uniqueWords.size) * 2.2);
    const discourseBonus = CONCLUSION_MARKER_REGEX.test(sent) ? 1.42 : 1.0;
    const endingBonus = COMPLETE_ENDING_REGEX.test(sent) ? 1.18 : 0.92;
    const lengthSweetSpot = sent.length >= 30 && sent.length <= 145 ? 1.15 : 1.0;
    const numericBonus = /\d+(%|명|원|억|만|조|년|월|일|배|건|개|시간|분)/.test(sent) ? 1.15 : 1.0;

    // Determine Zone: 0 = Intro (first 25%), 1 = Body (middle 50%), 2 = Conclusion (last 25%)
    const ratio = totalSentCount <= 1 ? 0 : idx / (totalSentCount - 1);
    const zone = ratio < 0.28 ? 0 : ratio > 0.72 ? 2 : 1;

    return {
      sent,
      idx,
      zone,
      words: uniqueWords,
      score: (normKwScore + titleOverlap * 3.2) * discourseBonus * endingBonus * lengthSweetSpot * numericBonus
    };
  });

  // Rule 2: Zone-Balanced Selection (Intro + Body + Conclusion) with Redundancy Filtering
  const selectedItems = [];
  const isTooSimilar = (cand) => {
    for (const picked of selectedItems) {
      let overlap = 0;
      for (const w of cand.words) {
        if (picked.words.has(w)) overlap += 1;
      }
      const sim = overlap / Math.max(1, Math.min(cand.words.size, picked.words.size));
      if (sim >= 0.65) return true;
    }
    return false;
  };

  if (totalSentCount >= 5) {
    // Pick top 1 from Intro (zone 0), top 1~2 from Body (zone 1), top 1 from Conclusion (zone 2)
    for (const targetZone of [0, 1, 2]) {
      const zoneBest = scored
        .filter((it) => it.zone === targetZone)
        .sort((a, b) => b.score - a.score);
      for (const cand of zoneBest) {
        if (!isTooSimilar(cand)) {
          selectedItems.push(cand);
          break;
        }
      }
    }
  }

  // Fill remaining slots up to 4 sentences from highest overall score without redundancy
  const targetSummaryCount = Math.min(4, Math.max(1, totalSentCount));
  for (const cand of [...scored].sort((a, b) => b.score - a.score)) {
    if (selectedItems.length >= targetSummaryCount) break;
    if (!selectedItems.some((p) => p.idx === cand.idx) && !isTooSimilar(cand)) {
      selectedItems.push(cand);
    }
  }

  // Sort chosen sentences back into natural reading order
  selectedItems.sort((a, b) => a.idx - b.idx);

  // Pick single highest-scoring sentence as 1-line Core Conclusion
  const topOneLine = [...selectedItems].sort((a, b) => b.score - a.score)[0]?.sent || '';

  const summaryBullets = [];
  if (subheadings.length >= 2) {
    summaryBullets.push(`주요 구성: ${subheadings.slice(0, 5).join(' · ')}`);
  }
  for (const item of selectedItems) {
    summaryBullets.push(item.sent);
  }
  for (const todoTxt of actionTodos) {
    summaryBullets.push(`주요 할 일: ${todoTxt}`);
  }

  const existingSourceBlock = rawBlocks.find((b) => b.type === 'callout' && (b.text || '').startsWith('출처:'));
  const sourceCalloutText = existingSourceBlock ? existingSourceBlock.text : (sourceUrl ? `출처: ${sourceUrl}` : '');

  const structuredBlocks = [];
  if (sourceCalloutText) {
    structuredBlocks.push({
      id: uid('b'),
      type: 'callout',
      text: sourceCalloutText
    });
  }

  if (summaryBullets.length > 0) {
    structuredBlocks.push({
      id: uid('b'),
      type: 'h2',
      text: '핵심 요약'
    });
    if (topOneLine && summaryBullets.length >= 2) {
      structuredBlocks.push({
        id: uid('b'),
        type: 'callout',
        text: `핵심 요지: ${topOneLine}`
      });
    }
    for (const sumLine of summaryBullets) {
      structuredBlocks.push({
        id: uid('b'),
        type: 'bullet',
        text: sumLine
      });
    }
    structuredBlocks.push({
      id: uid('b'),
      type: 'divider',
      text: ''
    });
    structuredBlocks.push({
      id: uid('b'),
      type: 'h2',
      text: '본문 내용'
    });
  }

  structuredBlocks.push(...bodyBlocks);

  return {
    blocks: structuredBlocks.slice(0, 220),
    summaryCount: summaryBullets.length,
    autoTags
  };
}

/**
 * Test connectivity and validity of a Gemini API key
 */
async function testGeminiApiKey(rawKey) {
  const key = (rawKey || '').trim().replace(/^["']|["']$/g, '');
  if (!key) return { ok: false, error: 'NO_KEY', message: 'API 키가 비어있습니다. 먼저 키를 입력해주세요.' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    // Uses the same verified model IDs as the real summarizer, trying each in order.
    const testModels = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
    let res = null;
    for (const m of testModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`;
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });
      if (res.ok || res.status !== 404) break;
    }
    clearTimeout(timer);

    if (res.ok) {
      return { ok: true, message: 'Google Gemini 정상 연결됨 (작동 준비 완료)' };
    }

    let errJson = null;
    try { errJson = await res.json(); } catch {}
    const serverMsg = errJson?.error?.message || `HTTP ${res.status}`;

    if (res.status === 400 || res.status === 403) {
      return { ok: false, error: 'INVALID_KEY', message: `API 키 오류: 키가 유효하지 않습니다. (${serverMsg})` };
    }
    if (res.status === 429) {
      return { ok: false, error: 'QUOTA', message: `할당량 초과: 무료 API 분당 또는 일일 한도를 초과했습니다. (${serverMsg})` };
    }
    return { ok: false, error: `HTTP_${res.status}`, message: `Google 서버 오류 (${res.status}): ${serverMsg}` };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { ok: false, error: 'TIMEOUT', message: '응답 시간 초과 (15초): 네트워크 상태를 확인해주세요.' };
    }
    return { ok: false, error: 'NETWORK', message: `네트워크 통신 오류: ${err.message || '인터넷 연결 또는 확장프로그램 차단 확인'}` };
  }
}

/**
 * High-Quality Abstractive Summarizer using Google Gemini API (with Automatic Sensitive-Data Masking)
 */
async function summarizeWithGeminiAI(title = '', rawBlocks = [], sourceUrl = '', isUserNote = false) {
  const apiKey = (state.settings.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const strippedBlocks = stripExistingSummaryBlocks(rawBlocks);
  const bodyBlocks = strippedBlocks.filter(
    (b) => !(b.type === 'callout' && (b.text || '').startsWith('출처:'))
  );

  // Always mask sensitive info on-device before building prompt
  const { safeTitle, safeBody, totalMasked } = prepareSafeNotePayloadForAI(title, bodyBlocks);
  if (safeBody.length < 10) {
    throw new Error('TOO_SHORT');
  }

  // Detect whether the document is primarily in a foreign language (e.g. English, Japanese, etc.)
  const hangulMatches = safeBody.match(/[가-힣]/g);
  const hangulCount = hangulMatches ? hangulMatches.length : 0;
  const isForeignDoc = hangulCount < 18 && safeBody.length >= 35;

  const promptText = isForeignDoc
    ? [
        '당신은 전문 이중언어 문서 요약 정리 도우미입니다. 아래 외국어(영어 등) 문서를 정밀 분석하여 두 가지 요약을 작성해주세요.',
        '1) 문서 원어로 된 핵심 요약 (originalSummary)',
        '2) 자연스럽고 유려한 한국어 번역 요약 (koreanSummary)',
        '반드시 아래 JSON 형식으로만 응답하세요:',
        JSON.stringify({
          isForeign: true,
          originalLangName: 'English',
          koreanSummary: {
            oneLine: '한국어로 번역된 한 줄 핵심 결론 (40~90자)',
            bullets: ['한국어 핵심 요점 1', '한국어 핵심 요점 2', '한국어 핵심 요점 3']
          },
          originalSummary: {
            oneLine: 'One-line core conclusion in the original language',
            bullets: ['Key bullet point 1 in original language', 'Key bullet point 2 in original language', 'Key bullet point 3 in original language']
          },
          tags: ['한국어키워드1', '한국어키워드2', '한국어키워드3']
        }),
        '',
        `문서 제목: ${safeTitle || 'No Title'}`,
        '문서 본문:',
        safeBody.slice(0, 12000)
      ].join('\n')
    : [
        '당신은 전문 문서 요약 정리 도우미입니다. 아래 문서의 전체 맥락(서론·본론·결론)을 파악하여 한국어로 명확하게 핵심만 요약해주세요.',
        '반드시 아래 JSON 형식으로만 응답하세요:',
        '{"isForeign":false,"oneLine":"문서 전체를 관통하는 한 줄 핵심 결론 (40~90자)","bullets":["핵심 요점 1 (완결된 문장)","핵심 요점 2 (완결된 문장)","핵심 요점 3 (완결된 문장)","핵심 요점 4 (필요시)"],"tags":["키워드1","키워드2","키워드3"]}',
        '',
        `문서 제목: ${safeTitle || '제목 없음'}`,
        '문서 본문:',
        safeBody.slice(0, 12000)
      ].join('\n');

  // Standard Google Gemini Flash models with fallback order
  // NOTE: Verified-working model IDs (original v1 deployment). Do NOT change without live-key testing.
  const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
  let parsedJson = null;
  let lastErr = null;

  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
  ];

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 22000);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          },
          safetySettings
        })
      });
      clearTimeout(timer);

      if (!res.ok) {
        let errJson = null;
        try { errJson = await res.json(); } catch {}
        const serverMsg = errJson?.error?.message || '';

        // If auth or quota fails, stop retrying models with the same key
        if (res.status === 400 || res.status === 403) {
          throw new Error(`API_KEY_INVALID: ${serverMsg || 'API 키가 올바르지 않거나 권한이 없습니다.'}`);
        }
        if (res.status === 429) {
          throw new Error(`QUOTA_EXCEEDED: ${serverMsg || '무료 API 할당량(분당 15회 또는 일일 한도)을 초과했습니다.'}`);
        }

        lastErr = new Error(`HTTP_${res.status}: ${serverMsg}`);
        continue;
      }

      const data = await res.json();
      const firstCandidate = data?.candidates?.[0];
      if (firstCandidate?.finishReason === 'SAFETY') {
        throw new Error('SAFETY_BLOCKED: 콘텐츠가 안전 정책에 의해 차단되었습니다.');
      }

      const rawReply = firstCandidate?.content?.parts?.[0]?.text || '';
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedJson = JSON.parse(jsonMatch[0]);
          break;
        } catch {
          try {
            const sanitized = jsonMatch[0].replace(/,\s*([\]}])/g, '$1');
            parsedJson = JSON.parse(sanitized);
            break;
          } catch {}
        }
      }
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        lastErr = new Error('TIMEOUT: AI 서버 응답 시간(22초)이 초과되었습니다.');
        continue;
      }
      if (
        err.message?.startsWith('API_KEY_INVALID') ||
        err.message?.startsWith('QUOTA_EXCEEDED') ||
        err.message?.startsWith('SAFETY_BLOCKED')
      ) {
        throw err;
      }
      lastErr = err;
    }
  }

  if (!parsedJson || (!parsedJson.oneLine && !parsedJson.koreanSummary && !parsedJson.korean && !Array.isArray(parsedJson.bullets))) {
    throw lastErr || new Error('AI_PARSE_FAILED');
  }

  const autoTags = Array.isArray(parsedJson.tags)
    ? parsedJson.tags
        .map((t) => String(t || '').replace(/^#/, '').trim())
        .filter(isMeaningfulTopicTag)
        .slice(0, 4)
    : [];

  const existingSourceBlock = rawBlocks.find((b) => b.type === 'callout' && (b.text || '').startsWith('출처:'));
  const sourceCalloutText = existingSourceBlock ? existingSourceBlock.text : (sourceUrl ? `출처: ${sourceUrl}` : '');

  const structuredBlocks = [];
  if (sourceCalloutText) {
    structuredBlocks.push({
      id: uid('b'),
      type: 'callout',
      text: sourceCalloutText
    });
  }

  // A. Bilingual Summary for Foreign Language Documents
  const kSum =
    parsedJson.koreanSummary ||
    (parsedJson.korean && typeof parsedJson.korean === 'object' ? parsedJson.korean : null);
  const oSum =
    parsedJson.originalSummary ||
    parsedJson.englishSummary ||
    (parsedJson.original && typeof parsedJson.original === 'object' ? parsedJson.original : null);

  if (kSum || oSum) {
    // 1. Korean Translated Summary
    if (kSum) {
      const kOneLine = String(kSum.oneLine || kSum.summary || '').trim();
      const kBullets = Array.isArray(kSum.bullets)
        ? kSum.bullets
        : Array.isArray(kSum.points)
        ? kSum.points
        : [];

      structuredBlocks.push({
        id: uid('b'),
        type: 'h2',
        text: '📌 한국어 핵심 요약 (번역)'
      });
      if (kOneLine) {
        structuredBlocks.push({
          id: uid('b'),
          type: 'callout',
          text: `핵심 요지: ${kOneLine}`
        });
      }
      for (const line of kBullets) {
        if (line) structuredBlocks.push({ id: uid('b'), type: 'bullet', text: String(line).trim() });
      }
    }

    // 2. Native Original Language Summary
    if (oSum) {
      const origLangName = parsedJson.originalLangName || 'English';
      const oOneLine = String(oSum.oneLine || oSum.summary || '').trim();
      const oBullets = Array.isArray(oSum.bullets)
        ? oSum.bullets
        : Array.isArray(oSum.points)
        ? oSum.points
        : [];

      structuredBlocks.push({
        id: uid('b'),
        type: 'h2',
        text: `🌐 원문 핵심 요약 (${origLangName})`
      });
      if (oOneLine) {
        structuredBlocks.push({
          id: uid('b'),
          type: 'callout',
          text: `Key Takeaway: ${oOneLine}`
        });
      }
      for (const line of oBullets) {
        if (line) structuredBlocks.push({ id: uid('b'), type: 'bullet', text: String(line).trim() });
      }
    }
  } else {
    // B. Standard Korean Summary
    const oneLine = String(parsedJson.oneLine || '').trim();
    const bullets = Array.isArray(parsedJson.bullets)
      ? parsedJson.bullets.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 5)
      : [];

    structuredBlocks.push({
      id: uid('b'),
      type: 'h2',
      text: '핵심 요약'
    });
    if (oneLine) {
      structuredBlocks.push({
        id: uid('b'),
        type: 'callout',
        text: `핵심 요지: ${oneLine}`
      });
    }
    for (const line of bullets) {
      structuredBlocks.push({ id: uid('b'), type: 'bullet', text: String(line).trim() });
    }
  }

  structuredBlocks.push({
    id: uid('b'),
    type: 'divider',
    text: ''
  });
  structuredBlocks.push({
    id: uid('b'),
    type: 'h2',
    text: isForeignDoc ? '원문 본문 내용' : '본문 내용'
  });
  structuredBlocks.push(...bodyBlocks);

  return {
    blocks: structuredBlocks.slice(0, 240),
    summaryCount: 6,
    autoTags,
    totalMasked,
    usedAI: true
  };
}

/**
 * YouTube Video Helper & Summarizer System
 */
function extractYouTubeVideoId(rawUrl = '') {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const str = rawUrl.trim();
  const patterns = [
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/))([a-zA-Z0-9_-]{11})/i,
    /^[a-zA-Z0-9_-]{11}$/
  ];
  for (const p of patterns) {
    const match = str.match(p);
    if (match) return match[1] || match[0];
  }
  return null;
}

async function summarizeYouTubeWithGeminiAI(videoId, videoTitle = '', apiKey = '') {
  if (!apiKey) throw new Error('NO_API_KEY');

  const promptText = `당신은 최고 수준의 영상 콘텐츠 분석 및 문서화 전문가(전문 테크 라이터 및 위키 에디터)입니다.
제공된 유튜브 영상을 처음부터 끝까지 정밀하게 시청하고 분석하여, 영상을 직접 보지 않고 이 문서만 읽더라도 영상의 전체 맥락, 세부 주장, 구체적 데이터, 핵심 원리, 주요 타임라인까지 100% 완벽하게 파악할 수 있는 LiveWiki 스타일의 고품질 심층 리포트를 작성해주세요.

[작성 지침 - 필수 준수]
1. 정형화된 꼬리표 금지: '제1주제', '발단 및 배경', '원인 분석' 같은 인위적이고 딱딱한 카테고리 틀을 절대 붙이지 마세요.
2. 내용 주도형 자연스러운 흐름: 영상에 챕터 구분이 없더라도 화자가 실제로 이야기하는 논리의 흐름(Storyline)을 있는 그대로 따라가며, 영상 분량에 맞추어 2개에서 6개 내외의 자연스러운 대주제(sections)로 구성하세요.
3. 구체적인 문장형 소제목: 각 섹션의 소제목(heading)은 해당 구간에서 다룬 핵심 알맹이가 한눈에 보이는 생생한 문장형/구문형 제목으로 작성하세요. (예: "1. 머스크의 메모리 갈증: 델의 경고와 반도체 시장의 딜레마", "2. HBM 공정이 초래한 병목 현상 및 LPDDR 상용 추진")
4. 풍부한 디테일과 시간대: 본문(sections)에는 두루뭉술한 요약 대신 화자가 언급한 구체적인 사례, 수치(%, 금액, 시간), 기업/인물명, 비유, 기술적 인과관계를 충실하게 서술하고, 주요 설명 뒤에 해당 내용이 나오는 영상 시간대(예: [02:35])를 자연스럽게 표기하세요. 단, 상단 'keyConclusions'에는 시간 표기를 넣지 마세요.
5. 외국어 영상이라 하더라도 최종 문서는 자연스럽고 정갈한 한국어로 작성하세요.
6. 태그(tags) 지침: '유튜브', '영상', '동영상', '요약' 같은 매체 형식이나 일반 명칭은 절대 태그에 넣지 마세요. 오직 영상 본문에서 실제로 심도 있게 다룬 '핵심 고유명사, 기술/산업 분야, 핵심 주제 키워드'(예: 'HBM', '엔비디아', '인공지능', '금리', '자율주행' 등)로 3~5개를 엄선하여 추출하세요.
7. 반드시 아래 지정된 JSON 규격으로만 응답해야 합니다.

{
  "title": "영상 원제 또는 내용을 직관적으로 대변하는 세련된 한글 제목",
  "keyConclusions": [
    "영상 전체를 관통하는 핵심 요약 1 (시간 표기 없이 완결된 문장으로 서술)",
    "영상 전체를 관통하는 핵심 요약 2 (시간 표기 없이 완결된 문장으로 서술)",
    "영상 전체를 관통하는 핵심 요약 3 (시간 표기 없이 완결된 문장으로 서술)"
  ],
  "sections": [
    {
      "heading": "1. 화자의 실제 논점을 드러내는 구체적 문장형 소제목",
      "paragraphs": [
        "구체적인 설명, 근거 데이터, 인과관계가 충실히 담긴 상세 설명 문단 [01:25]",
        "사례, 기술적 원리, 비교 분석 등이 서술된 상세 설명 문단 [03:40]"
      ]
    },
    {
      "heading": "2. 다음 논점에 대한 구체적 문장형 소제목",
      "paragraphs": [
        "상세 설명 문단 [06:15]",
        "상세 설명 문단 [08:50]"
      ]
    }
  ],
  "insights": "이 영상이 시청자나 관련 산업/실무에 주는 핵심 시사점 및 최종 결론 한 문단",
  "tags": ["핵심주제1", "핵심주제2", "핵심주제3"]
}`;

  const videoModels = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  let parsedJson = null;
  let lastErr = null;

  for (const model of videoModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(65000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  file_data: {
                    file_uri: `https://www.youtube.com/watch?v=${videoId}`
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        })
      });

      if (!res.ok) {
        let errBody = null;
        try { errBody = await res.json(); } catch {}
        const msg = errBody?.error?.message || `HTTP ${res.status}`;
        lastErr = new Error(msg);
        if (res.status === 404) continue;
        if (res.status === 400 || res.status === 403 || res.status === 429) {
          throw lastErr;
        }
        continue;
      }

      const resData = await res.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!rawText.trim()) throw new Error('EMPTY_RESPONSE');

      try {
        parsedJson = JSON.parse(rawText.trim());
        if (parsedJson) break;
      } catch {
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedJson = JSON.parse(cleaned);
        if (parsedJson) break;
      }
    } catch (err) {
      lastErr = err;
      if (err.name === 'AbortError') throw new Error('TIMEOUT');
      if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('QUOTA_EXCEEDED'))) {
        throw err;
      }
    }
  }

  if (!parsedJson) {
    throw lastErr || new Error('ALL_MODELS_FAILED');
  }

  return parsedJson;
}

function convertYouTubeAiSummaryToBlocks(aiResult, sourceUrl, videoId, fallbackTitle = '', channelName = '') {
  const blocks = [];

  // 1. YouTube 16:9 Responsive Media Block
  blocks.push({
    id: uid('b'),
    type: 'youtube',
    videoId,
    title: aiResult?.title || fallbackTitle || 'YouTube 동영상',
    channelTitle: channelName || '',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    url: sourceUrl || `https://www.youtube.com/watch?v=${videoId}`
  });

  // 2. Source callout
  blocks.push({
    id: uid('b'),
    type: 'callout',
    text: `출처: ${sourceUrl || `https://www.youtube.com/watch?v=${videoId}`}`
  });

  // 3. 핵심요약 섹션
  blocks.push({ id: uid('b'), type: 'h2', text: '핵심요약' });

  // 3-1. 기존 '핵심 시사점 & 결론' 내용을 콜아웃 박스로 바로 배치
  const insightsText = aiResult?.insights || aiResult?.takeaway || '';
  if (insightsText && String(insightsText).trim()) {
    blocks.push({ id: uid('b'), type: 'callout', text: String(insightsText).trim() });
  }

  // 3-2. 제목 없이 글머리 기호(bullet)로 핵심 요약 항목들 배치 (시간 표시 [00:00] 완벽 제거)
  const conclusions = Array.isArray(aiResult?.keyConclusions)
    ? aiResult.keyConclusions
    : (aiResult?.oneLine ? [aiResult.oneLine] : []);

  for (const c of conclusions) {
    if (c && String(c).trim()) {
      const cleaned = String(c)
        .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]|\(\d{1,2}:\d{2}(?::\d{2})?\)/g, '')
        .trim();
      if (cleaned) {
        blocks.push({ id: uid('b'), type: 'bullet', text: cleaned });
      }
    }
  }

  // 4. 한 줄 띄기 (구분선 Divider)
  blocks.push({ id: uid('b'), type: 'divider', text: '' });

  // 5. 별도 제목 없이 곧바로 본문 정리 내용 전개 (소주제별 H2 및 상세 문단들)
  if (Array.isArray(aiResult?.sections) && aiResult.sections.length > 0) {
    for (const sec of aiResult.sections) {
      if (sec.heading) {
        blocks.push({ id: uid('b'), type: 'h2', text: String(sec.heading).trim() });
      }
      const paras = Array.isArray(sec.paragraphs)
        ? sec.paragraphs
        : (Array.isArray(sec.bullets) ? sec.bullets : (sec.content ? [sec.content] : []));
      for (const p of paras) {
        if (p && String(p).trim()) {
          blocks.push({ id: uid('b'), type: 'p', text: String(p).trim() });
        }
      }
    }
  }

  return blocks;
}

async function clipAndSummarizeYouTube(videoId, rawUrl, options = {}) {
  const { summarize = true, openEditor = false, targetFolderId = null } = options;
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  showToast('🎬 유튜브 영상 정보 확인 중...');

  // 1. Fetch metadata via oEmbed
  let videoTitle = `YouTube 동영상 (${videoId})`;
  let channelName = '';
  let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (oembedRes && oembedRes.ok) {
      const data = await oembedRes.json();
      if (data.title) videoTitle = data.title;
      if (data.author_name) channelName = data.author_name;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    }
  } catch (e) {
    console.warn('[YouTube oEmbed warning]:', e);
  }

  const loadingBlockId = uid('b');
  const initialBlocks = [
    {
      id: uid('b'),
      type: 'youtube',
      videoId,
      title: videoTitle,
      channelTitle: channelName,
      thumbnailUrl,
      url: canonicalUrl
    },
    {
      id: uid('b'),
      type: 'callout',
      text: `출처: ${canonicalUrl}`
    }
  ];

  if (summarize) {
    initialBlocks.push({
      id: loadingBlockId,
      type: 'callout',
      text: `⏳ AI가 영상의 전체 맥락과 세부 내용을 심층 분석 중입니다 (약 15~25초 소요)... 다른 노트를 작성하거나 열람하셔도 작업이 안전하게 유지됩니다.`
    });
  }

  const folderId =
    targetFolderId ||
    (activeNav.startsWith('folder:') ? activeNav.slice(7) : 'f_clip');
  const now = new Date().toISOString();
  const newNote = {
    id: uid('note'),
    title: videoTitle,
    folderId: state.folders.some((f) => f.id === folderId) ? folderId : (state.folders[0]?.id || 'f_work'),
    docType: 'clip',
    status: '',
    priority: 'normal',
    favorite: activeNav === 'favorites',
    trashed: false,
    isEncrypted: false,
    tags: ['유튜브', '클리핑', ...(summarize ? ['요약'] : [])],
    createdAt: now,
    updatedAt: now,
    blocks: initialBlocks
  };

  state.notes.unshift(newNote);
  activeNoteId = newNote.id;
  scheduleSave();

  if (openEditor) {
    openNoteInEditor(newNote.id);
  } else {
    renderAll();
  }

  showToast(`유튜브 영상 노트가 생성되었습니다: ${videoTitle.slice(0, 24)}`);

  // Step 2: Asynchronous Gemini Deep Video Summarization
  const apiKey = (state.settings.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
  if (summarize) {
    if (!apiKey) {
      const loadBlock = newNote.blocks.find((b) => b.id === loadingBlockId);
      if (loadBlock) {
        loadBlock.text = `💡 Gemini API 키가 설정되지 않아 영상 심층 분석을 건너뛰었습니다. [설정 > AI 키]를 등록하시면 언제든 상단 [AI 요약]으로 분석을 받으실 수 있습니다.`;
        scheduleSave();
        if (activeNoteId === newNote.id) renderActiveNoteEditor();
      }
      showToast('Gemini API 키가 설정되지 않았습니다. 설정에서 키를 등록해 주세요.', 4000);
      return newNote;
    }

    summarizeYouTubeWithGeminiAI(videoId, videoTitle, apiKey)
      .then((aiResult) => {
        if (!aiResult || newNote.trashed || newNote.isEncrypted) return;

        const updatedBlocks = convertYouTubeAiSummaryToBlocks(aiResult, canonicalUrl, videoId, videoTitle, channelName);
        newNote.blocks = updatedBlocks;
        if (aiResult.title && (!newNote.title || newNote.title.startsWith('YouTube 동영상'))) {
          newNote.title = aiResult.title;
        }
        if (Array.isArray(aiResult.tags)) {
          for (const t of aiResult.tags) {
            const cleanTag = String(t).replace(/^#/, '').trim();
            if (cleanTag && !newNote.tags.includes(cleanTag) && isMeaningfulTopicTag(cleanTag)) {
              newNote.tags.push(cleanTag);
            }
          }
        }
        newNote.updatedAt = new Date().toISOString();
        scheduleSave();

        // Safe Non-blocking UI update: only re-render editor if the user is currently viewing THIS note
        if (activeNoteId === newNote.id) {
          renderActiveNoteEditor();
        } else {
          renderSidebar();
        }
        showToast(`✨ [${(newNote.title || '').slice(0, 20)}] 영상 심층 요약이 완료되었습니다!`, 4000);
      })
      .catch((err) => {
        console.warn('[YouTube Gemini Summarize Error]:', err);
        let reason = 'AI 통신 실패';
        const msg = String(err?.message || '');
        if (msg.includes('NO_API_KEY')) reason = 'Gemini API 키가 설정되지 않음';
        else if (msg.includes('TIMEOUT')) reason = 'AI 응답 시간 초과 (영상 분량 확인)';
        else if (msg.includes('QUOTA') || msg.includes('429')) reason = 'API 할당량 초과';
        else if (msg.includes('API_KEY_INVALID') || msg.includes('400') || msg.includes('403')) reason = 'API 키 불일치';
        else if (msg.includes('404')) reason = '일시적 모델 접근 불가';

        const loadBlock = newNote.blocks.find((b) => b.id === loadingBlockId);
        if (loadBlock) {
          loadBlock.text = `⚠️ AI 영상 심층 분석을 완료하지 못했습니다 (${reason}). 상단 [AI 요약] 메뉴를 누르면 언제든 다시 시도할 수 있습니다.`;
        }
        scheduleSave();
        if (activeNoteId === newNote.id) {
          renderActiveNoteEditor();
        }
        showToast(`유튜브 AI 요약 실패: ${reason}`, 4000);
      });
  }

  return newNote;
}

async function clipAndSummarizeUrl(rawUrl, options = {}) {
  const { summarize = true, openEditor = false, targetFolderId = null } = options;
  let url = String(rawUrl || '').trim();
  if (!/^https?:\/\/\S+/i.test(url)) {
    showToast('유효한 웹 주소(http:// 또는 https://)를 입력해주세요.');
    return null;
  }

  // 0. Detect YouTube Video URLs (watch, shorts, youtu.be, live, embed)
  const ytVideoId = extractYouTubeVideoId(url);
  if (ytVideoId) {
    return await clipAndSummarizeYouTube(ytVideoId, url, options);
  }

  // Automatically normalize CNN edition domain to www to avoid Jina's domain-level rate block
  if (/^https?:\/\/edition\.cnn\.com\//i.test(url)) {
    url = url.replace(/^https?:\/\/edition\.cnn\.com\//i, 'https://www.cnn.com/');
  }

  showToast(summarize ? '웹페이지 핵심 내용을 요약 정리 중...' : '웹페이지 본문 추출 중...');

  try {
    let html = '';
    let readerMarkdown = '';
    let finalUrl = url;
    let jinaTimedOut = false;

    const localRes = await fetch(`/api/clip?url=${encodeURIComponent(url)}`).catch(() => null);
    if (localRes && localRes.ok) {
      const data = await localRes.json();
      if (data.ok) {
        html = data.html || '';
        readerMarkdown = data.readerMarkdown || '';
        finalUrl = data.finalUrl || url;
      }
    }
    if (!html && !readerMarkdown) {
      // 1. Try Jina Reader. First request of a short link (e.g. naver.me) can take 20s+ to render,
      //    but Jina caches it, so a second attempt is usually fast. Retry once only on timeout/network error.
      for (let attempt = 0; attempt < 2 && !readerMarkdown; attempt++) {
        try {
          if (attempt === 1) showToast('응답이 지연되어 한 번 더 시도하는 중... (단축 주소는 처음에 시간이 걸릴 수 있습니다)', 4000);
          const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
            signal: AbortSignal.timeout(attempt === 0 ? 45000 : 30000)
          });
          if (jinaRes && jinaRes.ok) {
            const jinaText = await jinaRes.text();
            if (!jinaText.startsWith('{"data":null') && !jinaText.includes('"AbuseAlleviationError"')) {
              readerMarkdown = jinaText;
            }
          }
          break; // Got a definite HTTP answer (success or refusal): no point retrying
        } catch (e) {
          jinaTimedOut = true; // timeout or network error -> retry once
        }
      }

      // 2. If Jina failed or was blocked, try CORS proxies with timeout
      if (!html && !readerMarkdown) {
        const proxies = [
          `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
        ];
        for (const proxyUrl of proxies) {
          try {
            const pRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
            if (pRes && pRes.ok) {
              const pText = await pRes.text();
              if (
                pText &&
                pText.length > 200 &&
                !pText.includes('522: Connection timed out') &&
                !pText.includes('Cloudflare') &&
                !pText.includes('name="isbot"')
              ) {
                html = pText;
                break;
              }
            }
          } catch {}
        }
      }
    }

    if (!html && !readerMarkdown) {
      let domain = '';
      try { domain = new URL(url).hostname; } catch {}
      const fallbackTitle = `웹페이지 링크: ${domain || url}`;
      const isShortLink = /(^|\.)(naver\.me|bit\.ly|t\.co|tinyurl\.com|is\.gd|goo\.gl|ow\.ly|buff\.ly|lnkd\.in|youtu\.be|cnn\.it|bbc\.in|url\.kr|vo\.la)$/i.test(domain);
      const failMsg = jinaTimedOut
        ? `⏱️ ${domain}의 응답이 지연되어 본문을 가져오지 못했습니다. (보안 차단이 아니라 시간 초과일 수 있습니다.)`
        : `⚠️ 해당 웹사이트(${domain})의 외부 크롤러 접근 차단(보안 정책)으로 인해 URL 자동 추출이 제한되었습니다.`;
      const failHint = jinaTimedOut || isShortLink
        ? `💡 해결 방법: 잠시 후 같은 주소로 다시 시도해 보세요. (처음 읽는 단축 주소는 느리지만 두 번째는 빨라집니다.) 계속 안 되면 단축 주소 대신 주소창에 나온 기사 전체 주소를 붙여 넣거나, 본문을 복사(Ctrl+C)해 [웹 클리퍼 붙여넣기] 영역에 붙여넣기(Ctrl+V)하세요.`
        : `💡 해결 방법: 브라우저에서 해당 기사 페이지를 열고 본문을 복사(Ctrl+C)한 후, VaultNote의 [웹 클리퍼 붙여넣기] 영역이나 본문에 붙여넣기(Ctrl+V)하시면 서식과 이미지까지 즉시 완벽하게 저장 및 요약됩니다.`;
      const fallbackBlocks = [
        { id: uid('b'), type: 'callout', text: `출처: ${url}` },
        { id: uid('b'), type: 'p', text: failMsg },
        { id: uid('b'), type: 'p', text: failHint }
      ];

      const folderId = targetFolderId || (activeNav.startsWith('folder:') ? activeNav.slice(7) : 'f_clip');
      const now = new Date().toISOString();
      const fallbackNote = {
        id: uid('note'),
        title: fallbackTitle,
        folderId: state.folders.some((f) => f.id === folderId) ? folderId : (state.folders[0]?.id || 'f_work'),
        docType: 'clip',
        status: '',
        priority: 'normal',
        favorite: activeNav === 'favorites',
        trashed: false,
        isEncrypted: false,
        tags: ['클리핑', '링크'],
        createdAt: now,
        updatedAt: now,
        blocks: fallbackBlocks
      };

      state.notes.unshift(fallbackNote);
      activeNoteId = fallbackNote.id;
      scheduleSave();
      if (openEditor) openNoteInEditor(fallbackNote.id);
      else renderAll();

      showToast(
        jinaTimedOut
          ? '응답 지연으로 본문을 가져오지 못했습니다. 잠시 후 같은 주소로 다시 시도하거나 기사 전체 주소를 사용해주세요.'
          : '사이트 보안 차단으로 본문 자동 추출이 제한되었습니다. 기사 복사/붙여넣기를 이용해주세요.',
        4500
      );
      return fallbackNote;
    }

    const parsed = html
      ? parseHtmlToBlocks(html, finalUrl, readerMarkdown)
      : parseMarkdownToBlocks(readerMarkdown, finalUrl);

    const noteTitle = parsed.title || new URL(finalUrl).hostname;
    let finalBlocks = parsed.blocks;
    let tags = ['클리핑'];

    // Step 1: Immediately generate fast local summary so the note is created & displayed right away (< 1s)
    if (summarize) {
      const localSum = summarizeExtractedArticle(noteTitle, parsed.blocks, finalUrl);
      finalBlocks = localSum.blocks;
      tags = ['요약', '클리핑', ...localSum.autoTags.filter(isMeaningfulTopicTag)];
    }

    const folderId =
      targetFolderId ||
      (activeNav.startsWith('folder:') ? activeNav.slice(7) : 'f_clip');

    const now = new Date().toISOString();
    const newNote = {
      id: uid('note'),
      title: noteTitle,
      folderId: state.folders.some((f) => f.id === folderId) ? folderId : (state.folders[0]?.id || 'f_work'),
      docType: 'clip',
      status: '',
      priority: 'normal',
      favorite: activeNav === 'favorites',
      trashed: false,
      isEncrypted: false,
      tags,
      createdAt: now,
      updatedAt: now,
      blocks: finalBlocks
    };

    state.notes.unshift(newNote);
    activeNoteId = newNote.id;
    scheduleSave();

    if (openEditor) {
      openNoteInEditor(newNote.id);
    } else {
      renderAll();
    }

    showToast(
      summarize
        ? `핵심 요약 노트가 생성되었습니다: ${noteTitle.slice(0, 28)}`
        : `본문 클리핑 완료: ${noteTitle.slice(0, 28)}`
    );

    // Step 2: If Gemini API Key is configured, upgrade the summary in place with AI (~1s) without blocking note creation
    if (summarize && (state.settings.geminiApiKey || '').trim()) {
      summarizeWithGeminiAI(noteTitle, parsed.blocks, finalUrl, false)
        .then((aiSum) => {
          if (aiSum && aiSum.blocks && !newNote.trashed && !newNote.isEncrypted) {
            newNote.blocks = aiSum.blocks;
            for (const kw of aiSum.autoTags || []) {
              if (isMeaningfulTopicTag(kw) && !newNote.tags.includes(kw)) newNote.tags.push(kw);
            }
            newNote.updatedAt = new Date().toISOString();
            scheduleSave();
            renderAll();
            showToast(`AI 고품질 핵심 요약이 반영되었습니다: ${noteTitle.slice(0, 24)}`);
          }
        })
        .catch((err) => {
          console.warn('[Gemini Auto-Summarize Failed]:', err);
          let reason = 'AI 통신 실패';
          const msg = String(err?.message || '');
          if (msg.includes('API_KEY_INVALID') || msg.includes('400') || msg.includes('403')) {
            reason = 'API 키 불일치 (키 확인 필요)';
          } else if (msg.includes('QUOTA_EXCEEDED') || msg.includes('429')) {
            reason = 'API 일일/분당 할당량 초과';
          } else if (msg.includes('TIMEOUT')) {
            reason = 'AI 서버 응답 시간 초과';
          } else if (msg.includes('SAFETY_BLOCKED')) {
            reason = '콘텐츠 안전 정책 감지';
          }
          showToast(`AI 요약 연결 실패 (${reason}) -> 오프라인 추출 요약이 유지되었습니다.`, 3800);
        });
    }

    return newNote;
  } catch {
    showToast('URL 추출 실패: 웹 클리퍼의 복사 붙여넣기 영역을 이용해주세요.');
    return null;
  }
}

function setupBookmarklet() {
  const link = document.getElementById('bookmarklet-link');
  if (!link) return;
  const origin = window.location.origin + window.location.pathname;
  link.href = `javascript:(function(){var s=encodeURIComponent((window.getSelection&&window.getSelection().toString())||'');var u=encodeURIComponent(location.href);window.open('${origin}?clip_url='+u+'&clip_sel='+s,'_blank');})();`;

  // Prevent clicking the bookmarklet inside VaultNote itself from clipping VaultNote's own UI
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    const urlInput = document.getElementById('clipper-url-input');
    if (urlInput && /^https?:\/\/\S+/i.test(urlInput.value.trim())) {
      const targetUrl = urlInput.value.trim();
      urlInput.value = '';
      await clipAndSummarizeUrl(targetUrl, { summarize: true, openEditor: true });
      return;
    }
    try {
      const clipText = (await navigator.clipboard.readText())?.trim() || '';
      if (/^https?:\/\/\S+$/i.test(clipText) && !clipText.startsWith(window.location.origin)) {
        await clipAndSummarizeUrl(clipText, { summarize: true, openEditor: true });
        return;
      }
    } catch {}
    showToast('이 버튼은 마우스로 끌어서 브라우저 상단 북마크바(즐겨찾기 모음)에 등록해 두고, 외부 웹페이지를 볼 때 누르는 버튼입니다.', 3800);
  });
}

async function checkIncomingWebClipParams() {
  const params = new URLSearchParams(window.location.search);
  const clipUrl = (params.get('clip_url') || '').trim();
  const clipSel = (params.get('clip_sel') || params.get('clip_text') || '').trim();
  const clipTitle = (params.get('clip_title') || '').trim();

  if (!clipUrl && !clipSel && !clipTitle) return;
  window.history.replaceState({}, document.title, window.location.pathname);

  // Never clip VaultNote's own URL
  if (clipUrl && clipUrl.startsWith(window.location.origin)) {
    return;
  }

  // If a valid external URL was sent by the bookmarklet, use our full Readability + Summarizer engine
  if (clipUrl && /^https?:\/\/\S+/i.test(clipUrl)) {
    const createdNote = await clipAndSummarizeUrl(clipUrl, { summarize: true, openEditor: true });
    if (createdNote && clipSel) {
      createdNote.blocks.splice(1, 0, {
        id: uid('b'),
        type: 'callout',
        text: `선택한 문구: ${clipSel}`
      });
      scheduleSave();
      renderAll(true);
    }
    return;
  }

  if (clipTitle || clipSel) {
    const now = new Date().toISOString();
    const lines = clipSel.split('\n').map((l) => l.trim()).filter(Boolean);
    const blocks = lines.map((line) => ({ id: uid('b'), type: 'p', text: line }));
    if (blocks.length === 0) blocks.push({ id: uid('b'), type: 'p', text: '' });

    const newNote = {
      id: uid('note'),
      title: clipTitle || '웹 클리핑',
      folderId: 'f_clip',
      docType: 'clip',
      status: '',
      priority: 'normal',
      favorite: false,
      trashed: false,
      isEncrypted: false,
      tags: ['클리핑'],
      createdAt: now,
      updatedAt: now,
      blocks
    };
    state.notes.unshift(newNote);
    activeNoteId = newNote.id;
    activeViewMode = 'editor';
    scheduleSave();
    renderAll(true);
    showToast('웹페이지가 클리핑되었습니다.');
  }
}

// ============================================================================
// Workspace View Router
// ============================================================================
function renderWorkspaceView() {
  const listView = document.getElementById('workspace-list-view');
  const editorArea = document.getElementById('workspace-editor-area');
  const tableView = document.getElementById('workspace-table-view');
  const kanbanView = document.getElementById('workspace-kanban-view');
  const vaultView = document.getElementById('workspace-vault-view');
  const graphView = document.getElementById('workspace-graph-view');
  const clipperView = document.getElementById('workspace-clipper-view');

  [listView, editorArea, tableView, kanbanView, vaultView, graphView, clipperView].forEach((el) =>
    el?.classList.add('hidden')
  );

  document.querySelectorAll('.view-Segment .seg-btn').forEach((btn) => {
    const isSpecialNav = ['vault', 'graph', 'clipper'].includes(activeNav);
    btn.classList.toggle('active', !isSpecialNav && btn.dataset.viewmode === activeViewMode);
  });
  document.querySelectorAll('#topbar-more-dropdown button[data-more-view]').forEach((btn) => {
    const isSpecialNav = ['vault', 'graph', 'clipper'].includes(activeNav);
    btn.classList.toggle('active', !isSpecialNav && btn.dataset.moreView === activeViewMode);
  });
  const themeDesc = document.getElementById('more-theme-current');
  if (themeDesc) {
    themeDesc.textContent = state.settings.theme === 'dark' ? '현재: 다크' : '현재: 라이트';
  }

  if (activeNav === 'vault') {
    document.getElementById('active-note-breadcrumb').textContent = '보안 금고';
    vaultView.classList.remove('hidden');
    renderSecureVaultView();
    return;
  }
  if (activeNav === 'graph') {
    document.getElementById('active-note-breadcrumb').textContent = '연결 그래프';
    graphView.classList.remove('hidden');
    renderKnowledgeGraph();
    return;
  }
  if (activeNav === 'clipper') {
    document.getElementById('active-note-breadcrumb').textContent = '웹 클리퍼';
    clipperView.classList.remove('hidden');
    return;
  }

  if (activeViewMode === 'list') {
    renderMainNoteListView();
    listView.classList.remove('hidden');
  } else if (activeViewMode === 'table') {
    renderTableView();
    tableView.classList.remove('hidden');
  } else if (activeViewMode === 'kanban') {
    renderKanbanView();
    kanbanView.classList.remove('hidden');
  } else {
    renderActiveNoteEditor();
    renderSecondarySplitPane();
    editorArea.classList.remove('hidden');
  }
}

// ============================================================================
// Navigation History & Smartphone 2-Tier Gesture Controller
// Tier 0: Root Note List (depth: 0)
// Tier 1: Detail Views (Editor / Split / Table / Kanban / Vault / Graph / Clipper) (depth: 1)
// ============================================================================
let isHistoryInitialized = false;

function getNavStateSnapshot(depth = 0) {
  return {
    vn: true,
    depth,
    activeNav,
    activeViewMode,
    activeNoteId,
    secondaryNoteId
  };
}

function initNavigationHistory() {
  if (isHistoryInitialized) return;
  isHistoryInitialized = true;

  const isList = activeViewMode === 'list';

  // 1. Tier 0 바닥 상태: 목록 화면을 히스토리 루트로 고정
  window.history.replaceState(
    { vn: true, depth: 0, view: 'list', activeNav: 'all' },
    ''
  );

  // 2. 만약 첫 화면이 본문(에디터)이라면 Tier 1 상태를 1개 push
  if (!isList) {
    window.history.pushState(getNavStateSnapshot(1), '');
  }

  // 3. 모바일 브라우저의 사용자 상호작용(User Activation) 보안 정책 완벽 보장:
  // 앱 최초 구동 후 사용자가 화면을 처음 터치/클릭하는 순간,
  // 브라우저가 Tier 1 스택을 정식 제스처 엔트리로 확정하도록 보장
  const ensureUserGestureActivation = () => {
    if (activeViewMode !== 'list' && window.history.state?.depth !== 1) {
      window.history.pushState(getNavStateSnapshot(1), '');
    }
  };
  window.addEventListener('touchstart', ensureUserGestureActivation, { once: true, passive: true });
  window.addEventListener('pointerdown', ensureUserGestureActivation, { once: true, passive: true });
}

function syncNavigationHistory(fromPopState = false, replaceHistory = false) {
  if (!isHistoryInitialized) return;
  const currentDepth = Number(window.history.state?.depth ?? 0);
  const isList = activeViewMode === 'list';

  if (fromPopState) {
    // popstate로 이동해왔을 때:
    // 이미 브라우저가 스택을 이동시켰으므로 상태만 정리
    if (isList && currentDepth !== 0) {
      window.history.replaceState(getNavStateSnapshot(0), '');
    }
    return;
  }

  if (isList) {
    // [목록 화면으로 전환할 때]
    if (currentDepth === 1) {
      // 1층(상세)에 있던 상태에서 화면 버튼/메뉴를 눌러 목록으로 나가는 경우:
      // 브라우저 히스토리를 1단계 뒤로(history.back) 감아주어 스택 중복을 완벽히 방지!
      // (목록에 진입했을 때 스택이 무조건 0층에 위치하게 됨)
      window.history.back();
    } else {
      // 이미 0층 목록에 있던 상태라면 목록 필터 상태만 최신으로 치환
      window.history.replaceState(getNavStateSnapshot(0), '');
    }
  } else {
    // [상세 화면(에디터/특수화면)으로 전환할 때]
    if (currentDepth === 1 || replaceHistory) {
      // 이미 1층에 있거나 명시적 교체 요청이면 히스토리를 늘리지 않고 1층에서 내용만 교체
      window.history.replaceState(getNavStateSnapshot(1), '');
    } else {
      // 0층(목록)에서 1층으로 새로 올라갈 때만 pushState로 1단계 확장
      window.history.pushState(getNavStateSnapshot(1), '');
    }
  }
}

function renderAll(fromPopState = false, replaceHistory = false) {
  const currentTheme = localStorage.getItem('vaultnote_theme') || state.settings?.theme || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  state.settings.theme = currentTheme;
  document.getElementById('editor-inner-wrap')?.classList.toggle('full-width', Boolean(state.settings.fullWidth));
  const isMobile = window.innerWidth <= 820;
  const collapsed = isSidebarCollapsedOnDevice();
  document.getElementById('sidebar')?.classList.toggle('collapsed', collapsed);
  document.getElementById('sidebar-backdrop')?.classList.toggle('hidden', collapsed || !isMobile);
  syncNavigationHistory(fromPopState, replaceHistory);
  renderSidebar();
  renderWorkspaceView();
}

// ============================================================================
// Initialization & Event Binding
// ============================================================================
async function initApp() {
  const saved = await VaultStorage.loadState();
  const localTheme = localStorage.getItem('vaultnote_theme') || 'dark';
  if (saved && Array.isArray(saved.notes)) {
    state = {
      ...createInitialState(),
      ...saved,
      settings: { ...createInitialState().settings, ...(saved.settings || {}), theme: localTheme }
    };
    state.folders.forEach((f) => {
      delete f.icon;
      f.name = stripLeadingEmojis(f.name);
    });
    if (!state.folders.some((f) => f.id === 'f_security' || /보안/.test(f.name))) {
      state.folders.push({ id: 'f_security', name: '보안 폴더' });
    }
    state.notes.forEach((n) => {
      n.title = stripLeadingEmojis(n.title);
    });
    sanitizeExistingNoteTags();
  } else {
    await VaultStorage.saveState(state);
  }

  // 첫 화면: 맨 마지막에 편집하던(가장 최신 updatedAt) 노트로 에디터 자동 열기
  const validNotes = (state.notes || []).filter((n) => !n.trashed);
  if (validNotes.length > 0) {
    validNotes.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    activeNoteId = validNotes[0].id;
    activeViewMode = 'editor';
  } else {
    activeNoteId = null;
    activeViewMode = 'list';
  }

  document.getElementById('scratchpad-textarea').value = state.scratchpad || '';
  const geminiKeyEl = document.getElementById('gemini-api-key-input');
  if (geminiKeyEl) geminiKeyEl.value = state.settings.geminiApiKey || '';
  const onedriveTokenEl = document.getElementById('onedrive-token-input');
  if (onedriveTokenEl) onedriveTokenEl.value = state.settings.onedriveToken || '';
  const gdriveTokenEl = document.getElementById('gdrive-token-input');
  if (gdriveTokenEl) gdriveTokenEl.value = state.settings.gdriveToken || '';

  if (state.settings.appLockVerifier) {
    document.getElementById('app-lock-overlay').classList.remove('hidden');
  }

  checkIncomingWebClipParams();
  setupBookmarklet();
  initNavigationHistory();
  bindEvents();

  // 기기별 맞춤 메뉴바 초기화 (노트북/PC는 항상 펼침, 스마트폰은 닫힘)
  const initialCollapsed = isSidebarCollapsedOnDevice();
  updateSidebarUI(initialCollapsed);
  renderAll(true);
  resetIdleTimer();

  const folders = await VaultStorage.detectPCCloudFolders();
  const sel = document.getElementById('detected-cloud-folders');
  if (sel && folders.length > 0) {
    sel.innerHTML =
      `<option value="">감지된 PC 클라우드 폴더 선택...</option>` +
      folders.map((f) => `<option value="${escapeHtml(f.vaultDir)}">${escapeHtml(f.name)} (${escapeHtml(f.vaultDir)})</option>`).join('');
    if (!state.settings.pcVaultDir && folders[0]) {
      state.settings.pcVaultDir = folders[0].vaultDir;
    }
  }
  document.getElementById('custom-vault-dir-input').value = state.settings.pcVaultDir || '';
  document.getElementById('chk-auto-pc-sync').checked = Boolean(state.settings.autoPcSync);

  // Display LAN URL for Smartphone Web App access & initialize Zero-Click Live Sync
  fetch('/api/cloud-folders')
    .then((r) => r.json())
    .then((d) => {
      const box = document.getElementById('mobile-lan-url-box');
      if (box && d && Array.isArray(d.lanUrls) && d.lanUrls.length > 0) {
        box.innerHTML = `내 스마트폰 접속 주소 (동일 공유기/와이파이): <span style="user-select:all;text-decoration:underline;">${escapeHtml(d.lanUrls[0])}</span>`;
      } else if (box) {
        box.textContent = `접속 주소: ${window.location.origin}`;
      }
    })
    .catch(() => {});

  await pullLiveSyncStateIfNewer(true);

  // ============================================================================
  // 하이브리드 스마트 절전 동기화 (Smart Adaptive Polling Engine)
  // - 창 포커스 복귀 / 화면 켜짐 시: 즉시(0초) 1회 확인
  // - 포커스 활성 작업 중 (최근 3분 내 사용): 4초 간격 초고속 실시간 확인
  // - 포커스 없음 (다른 창 사용 중이지만 화면에 보임): 20초 간격 절전 확인
  // - 장시간 자리 비움 (5분 이상 조작 없음): 60초 간격 초절전 확인
  // - 창 최소화 / 화면 꺼짐 / 다른 탭: 완전 중단 (0회)
  // ============================================================================
  let lastUserActivityTime = Date.now();
  const markUserActivity = () => {
    lastUserActivityTime = Date.now();
  };
  window.addEventListener('pointerdown', markUserActivity, { passive: true });
  window.addEventListener('keydown', markUserActivity, { passive: true });
  window.addEventListener('scroll', markUserActivity, { passive: true });

  window.addEventListener('focus', () => {
    markUserActivity();
    pullLiveSyncStateIfNewer(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      markUserActivity();
      pullLiveSyncStateIfNewer(false);
    }
  });

  let lastSyncPollTime = Date.now();
  setInterval(() => {
    // 1. 화면이 숨겨져 있으면(최소화, 화면 꺼짐, 다른 탭) 완전 정지
    if (document.visibilityState !== 'visible') return;

    // 2. 사용자가 현재 직접 글을 타이핑 중이면 로컬 편집 방해 방지를 위해 폴링 건너뜀
    const activeEl = document.activeElement;
    const isTyping =
      activeEl &&
      (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
    if (isTyping) return;

    const now = Date.now();
    const idleMs = now - lastUserActivityTime;

    // 동적 주기 결정: 사용 중일 땐 4초 실시간, 5분 이상 조작 없을 땐 60초 초절전
    const intervalMs = idleMs >= 5 * 60 * 1000 ? 60000 : 4000;

    if (now - lastSyncPollTime >= intervalMs) {
      lastSyncPollTime = now;
      pullLiveSyncStateIfNewer(false);
    }
  }, 1000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    let isUpdatePromptShown = false;
    const promptForUpdate = (worker) => {
      if (isUpdatePromptShown) return;
      isUpdatePromptShown = true;
      showToast(
        '✨ 새 버전이 준비되었습니다.',
        15000,
        '지금 적용',
        () => {
          if (worker) {
            worker.postMessage({ action: 'skipWaiting' });
          } else {
            window.location.reload();
          }
        }
      );
    };

    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // 0. 앱 시작 즉시 서버의 최신 sw.js를 명시적으로 체크
      reg.update().catch(() => {});

      // 1. 이미 백그라운드에 대기 중인 새 워커가 있을 때
      if (reg.waiting && navigator.serviceWorker.controller) {
        promptForUpdate(reg.waiting);
      }

      // 2. 새로운 업데이트 파일 다운로드 완료 감지
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            promptForUpdate(newWorker);
          }
        });
      });

      // 3. 브라우저 창 복귀, 온라인 복구 및 15분 주기 정기 체크
      window.addEventListener('focus', () => {
        reg.update().catch(() => {});
      });
      window.addEventListener('online', () => {
        reg.update().catch(() => {});
        showToast('네트워크에 다시 연결되었습니다.');
        if (hasPendingCloudSync) {
          scheduleSave(true, true);
        }
        setTimeout(() => {
          pullLiveSyncStateIfNewer(false);
        }, 800);
      });
      setInterval(() => {
        if (navigator.onLine) reg.update().catch(() => {});
      }, 15 * 60 * 1000);
    }).catch(() => {});

    // 새 서비스 워커 활성화 시 안전하게 페이지 새로고침
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

function bindEvents() {
  ['mousemove', 'keydown', 'click', 'touchstart'].forEach((ev) => {
    window.addEventListener(ev, resetIdleTimer, { passive: true });
  });

  // Touch swipe from left edge to open sidebar on mobile (Galaxy Z Fold & smartphones)
  let edgeTouchStartX = 0;
  let edgeTouchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    if (window.innerWidth <= 820 && e.touches.length === 1) {
      edgeTouchStartX = e.touches[0].clientX;
      edgeTouchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (window.innerWidth <= 820 && edgeTouchStartX < 35 && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - edgeTouchStartX;
      const deltaY = Math.abs(e.changedTouches[0].clientY - edgeTouchStartY);
      if (deltaX > 60 && deltaY < 50) {
        updateSidebarUI(false);
      }
    }
  }, { passive: true });

  // Global Shortcuts
  window.addEventListener('keydown', (e) => {
    // Undo (Ctrl+Z / Cmd+Z) & Redo (Ctrl+Y / Ctrl+Shift+Z)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      const activeEl = document.activeElement;
      const isInsideNoteBody = activeEl && (activeEl.classList?.contains('block-editable') || activeEl.id === 'note-title-input');
      if (isInsideNoteBody || activeViewMode === 'editor') {
        e.preventDefault();
        if (e.shiftKey) {
          performRedo();
        } else {
          performUndo();
        }
        return;
      }
      if (!isInsideNoteBody && lastTrashedNoteIds.length > 0) {
        e.preventDefault();
        undoLastNoteTrash();
        return;
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      const activeEl = document.activeElement;
      const isInsideNoteBody = activeEl && (activeEl.classList?.contains('block-editable') || activeEl.id === 'note-title-input');
      if (isInsideNoteBody || activeViewMode === 'editor') {
        e.preventDefault();
        performRedo();
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal();
    } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
      e.preventDefault();
      toggleSidebar();
    } else if (e.altKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      createNewNote();
    } else if (e.altKey && e.key.toLowerCase() === 'q') {
      e.preventDefault();
      document.getElementById('scratchpad-drawer').classList.toggle('hidden');
    } else if (e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      lockEverything('화면이 잠금 상태로 전환되었습니다.', true);
    } else if (e.key === 'Escape') {
      closeSlashMenu();
      if (selectedBlockIds.size > 0) {
        clearBlockSelection();
      }
      document.getElementById('search-modal').classList.add('hidden');
    }

    // Notion-style shortcuts for multi-block conversion (Ctrl+Shift+0..8 or Cmd+Shift+0..8)
    if (selectedBlockIds.size > 0 && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      const keyMap = {
        '0': 'p',
        '1': 'h1',
        '2': 'h2',
        '3': 'h3',
        '4': 'todo',
        '5': 'bullet',
        '6': 'number',
        '7': 'callout',
        '8': 'toggle'
      };
      if (keyMap[e.key]) {
        e.preventDefault();
        applyBlockTypeToSelectedBlocks(keyMap[e.key]);
        return;
      }
    }

    // Delete or Backspace key when multiple blocks are selected
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockIds.size > 0) {
      const activeEl = document.activeElement;
      const isOutsideEditor = activeEl && activeEl.closest('.modal-backdrop, #search-modal, #note-title-input, #note-tag-popover-input, #scratchpad-drawer');
      if (!isOutsideEditor) {
        e.preventDefault();
        deleteSelectedBlocks();
        return;
      }
    }

    // Ctrl+C / Cmd+C when multiple blocks are selected (Copy selected blocks content)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedBlockIds.size > 0) {
      const activeEl = document.activeElement;
      const selText = window.getSelection()?.toString();
      // 글자 범위 드래그 선택이 없는 경우에만 블록 전체 내용 클립보드 복사
      if (!selText || selText.length === 0) {
        const note = getActiveNote();
        const blocks = getEditableBlocksForNote(note) || [];
        const lines = blocks
          .filter((b) => selectedBlockIds.has(b.id))
          .map((b) => b.text || b.details || (b.rows ? b.rows.map(r => r.join('\t')).join('\n') : ''))
          .filter((t) => t.trim().length > 0);
        if (lines.length > 0) {
          navigator.clipboard.writeText(lines.join('\n'));
          showToast(`${selectedBlockIds.size}개 블록 내용이 복사되었습니다.`);
        }
      }
    }
  });

  window.addEventListener('click', (e) => {
    if (!e.target.closest('#slash-menu') && !e.target.closest('.block-plus-btn')) {
      closeSlashMenu();
    }
  });

  // 자연스러운 2단계 뒤로가기: 본문에서 뒤로가기 -> 목록 직행, 목록에서 뒤로가기 -> 자연스러운 홈 화면 퇴장(스마트폰 OS 표준)
  window.addEventListener('popstate', (e) => {
    closeSlashMenu();

    // 0. 열려있는 태그 말풍선이 있다면 말풍선만 먼저 닫기
    const tagPopover = document.getElementById('note-tag-popover');
    if (tagPopover && !tagPopover.classList.contains('hidden')) {
      closeTagPopover();
      return;
    }

    // 1. 열려있는 모달(검색창, 동기화 창 등)이 있다면 모달만 먼저 닫기
    const openModals = document.querySelectorAll('.modal-backdrop:not(.hidden)');
    if (openModals.length > 0) {
      openModals.forEach((m) => m.classList.add('hidden'));
      return;
    }

    // 2. 본문(에디터) 또는 특수 뷰(1층)에서 뒤로가기를 눌렀을 때:
    // 과거 노트를 거꾸로 순회하지 않고 무조건 최신 [목록 화면](0층)으로 직행!
    if (activeViewMode !== 'list') {
      activeViewMode = 'list';
      renderAll(true, true);
      return;
    }

    // 3. 이미 [목록 화면]일 때:
    // 인위적인 가드를 걸지 않고 스마트폰 OS의 표준 흐름(홈 화면 퇴장/백그라운드 전환)에 맡김
  });


  // Undo / Redo Buttons
  document.getElementById('btn-editor-undo')?.addEventListener('click', (e) => {
    e.preventDefault();
    performUndo();
  });
  document.getElementById('btn-editor-redo')?.addEventListener('click', (e) => {
    e.preventDefault();
    performRedo();
  });

  // Multi-block batch action bar listeners
  const btnMultiTurninto = document.getElementById('btn-multi-turninto');
  const turnintoMenu = document.getElementById('multi-turninto-menu');
  btnMultiTurninto?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    turnintoMenu?.classList.toggle('hidden');
  });

  turnintoMenu?.querySelectorAll('[data-turn-type]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyBlockTypeToSelectedBlocks(btn.dataset.turnType);
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#multi-turninto-menu') && !e.target.closest('#btn-multi-turninto')) {
      turnintoMenu?.classList.add('hidden');
    }
  });

  document.getElementById('btn-delete-selected-blocks')?.addEventListener('click', (e) => {
    e.preventDefault();
    deleteSelectedBlocks();
  });
  document.getElementById('btn-select-all-blocks')?.addEventListener('click', (e) => {
    e.preventDefault();
    selectAllBlocks();
  });
  document.getElementById('btn-cancel-block-selection')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearBlockSelection();
  });

  // Toggle Sidebar, List View, Editor Width
  document.getElementById('btn-toggle-sidebar').addEventListener('click', toggleSidebar);
  document.getElementById('btn-close-sidebar')?.addEventListener('click', closeSidebar);
  const backdropEl = document.getElementById('sidebar-backdrop');
  if (backdropEl) {
    const handleBackdropClose = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    };
    backdropEl.addEventListener('click', handleBackdropClose);
    backdropEl.addEventListener('pointerdown', handleBackdropClose);
  }

  // 모바일에서 사이드바가 열려있을 때 우측 메인 영역(노트 본문 등) 터치/클릭 시 사이드바 즉시 닫기
  const workspaceEl = document.getElementById('main-workspace');
  const handleWorkspaceCloseSidebar = (e) => {
    if (window.innerWidth <= 820) {
      const sidebar = document.getElementById('sidebar');
      const isSidebarOpen = sidebar && !sidebar.classList.contains('collapsed');
      if (isSidebarOpen && !e.target.closest('#btn-toggle-sidebar') && !e.target.closest('#sidebar')) {
        closeSidebar();
      }
    }
  };
  workspaceEl?.addEventListener('click', handleWorkspaceCloseSidebar);
  workspaceEl?.addEventListener('pointerdown', handleWorkspaceCloseSidebar);
  document.getElementById('btn-toggle-width').addEventListener('click', () => {
    state.settings.fullWidth = !state.settings.fullWidth;
    scheduleSave(false);
    renderAll();
  });

  // Clicking empty bottom pad focuses or adds last line
  document.getElementById('editor-bottom-pad').addEventListener('click', () => {
    const note = getActiveNote();
    const blocks = getEditableBlocksForNote(note);
    if (!note || !blocks) return;
    const last = blocks[blocks.length - 1];
    if (last && last.type === 'p' && !last.text) {
      focusBlock(last.id);
    } else {
      const nb = { id: uid('b'), type: 'p', text: '' };
      blocks.push(nb);
      touchNote(note, blocks);
      renderActiveNoteEditor();
      focusBlock(nb.id);
    }
  });

  // Clipboard Paste (Ctrl+V):
  // 1) In Note List View: pasting a web URL automatically fetches, summarizes, and adds a note!
  // 2) In Web Clipper Paste Zone: automatically fills #clipper-source-url from Windows CF_HTML SourceURL!
  // 3) In Editor View: pasting an image or copied webpage text automatically attaches a OneNote-style clickable source URL!
  window.addEventListener('paste', async (e) => {
    const activeEl = document.activeElement;
    const isTextInput =
      activeEl &&
      (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

    // If pasting inside any modal (Cloud Sync, Security, Vault, Search, etc.), never intercept with web clipping!
    if (activeEl && (activeEl.closest?.('.modal-backdrop') || activeEl.closest?.('.modal-card'))) {
      return;
    }

    // 1. Pasting a standalone web URL in Note List View (or anywhere outside note body editor) automatically clips & summarizes!
    const isInsideNoteEditorField =
      activeEl &&
      (activeEl.id === 'note-title-input' ||
        activeEl.id === 'note-tag-popover-input' ||
        activeEl.id === 'scratchpad-textarea' ||
        activeEl.id === 'clipper-paste-zone' ||
        activeEl.id === 'gemini-api-key-input' ||
        activeEl.id === 'modal-gemini-key-input' ||
        activeEl.id === 'gdrive-token-input' ||
        activeEl.id === 'onedrive-token-input' ||
        activeEl.classList?.contains('block-editable') ||
        activeEl.classList?.contains('toggle-details-input') ||
        activeEl.closest?.('.block-table'));

    if (isTextInput && !isInsideNoteEditorField && activeEl?.id !== 'list-quick-url-input') {
      return;
    }

    if (
      !['vault', 'graph', 'trash'].includes(activeNav) &&
      (activeViewMode === 'list' || !isInsideNoteEditorField || activeEl?.id === 'list-quick-url-input')
    ) {
      const pastedText = (e.clipboardData?.getData('text/plain') || '').trim();
      if (/^https?:\/\/\S+$/i.test(pastedText)) {
        e.preventDefault();
        const quickInput = document.getElementById('list-quick-url-input');
        if (quickInput) quickInput.value = '';
        clipAndSummarizeUrl(pastedText, {
          summarize: true,
          openEditor: activeViewMode === 'editor'
        });
        return;
      }
    }

    // 2. If user pastes inside Web Clipper Paste Zone, auto-populate #clipper-source-url
    if (activeNav === 'clipper' && activeEl?.id === 'clipper-paste-zone') {
      const srcUrl = await detectClipboardSourceUrl(e.clipboardData);
      const srcInput = document.getElementById('clipper-source-url');
      if (srcUrl && srcInput && !srcInput.value.trim()) {
        srcInput.value = srcUrl;
        showToast('복사한 웹페이지의 원문 출처 링크가 자동 감지되었습니다.');
      }
      return;
    }

    if (activeNav === 'clipper' || activeViewMode !== 'editor') return;

    // 3. Pasting an image in Editor View
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          insertImageFileIntoNote(file);
          const srcUrl = await detectClipboardSourceUrl(e.clipboardData);
          if (srcUrl) {
            appendOneNoteSourceLinkToActiveNote(srcUrl);
          }
          return;
        }
      }
    }

    // 4. Smart Structured Text Paste & OneNote-style Source Link in Editor View:
    const htmlClip = e.clipboardData?.getData('text/html') || '';
    const plainClip = (e.clipboardData?.getData('text/plain') || '').trim();
    if (plainClip && !/^https?:\/\/\S+$/i.test(plainClip)) {
      const focusedRow = activeEl?.closest?.('.block-row');
      const targetBlockId = focusedRow?.dataset?.blockId || null;
      const isInsideBlockEditable = activeEl && (activeEl.classList?.contains('block-editable') || activeEl.closest?.('.block-row'));

      if (isInsideBlockEditable && targetBlockId) {
        const parsedBlocks = parseStructuredTextToBlocks(plainClip, htmlClip);
        // If parsed into multiple blocks or a structured block (bullets, headings, indents, todos, etc.)
        if (parsedBlocks.length > 1 || (parsedBlocks.length === 1 && (parsedBlocks[0].type !== 'p' || parsedBlocks[0].indent > 0))) {
          e.preventDefault();
          recordPreActionSnapshot();

          const note = getActiveNote();
          const blocks = getEditableBlocksForNote(note);
          if (note && blocks) {
            const targetIdx = blocks.findIndex((b) => b.id === targetBlockId);
            if (targetIdx !== -1) {
              const targetBlock = blocks[targetIdx];
              // If target block is currently empty, replace it; otherwise insert after it
              if (!targetBlock.text || !targetBlock.text.trim()) {
                blocks.splice(targetIdx, 1, ...parsedBlocks);
              } else {
                blocks.splice(targetIdx + 1, 0, ...parsedBlocks);
              }
              touchNote(note, blocks);
              renderActiveNoteEditor();
              focusBlock(parsedBlocks[parsedBlocks.length - 1].id);
              showToast(`AI 답변/서식을 스마트 블록으로 붙여넣었습니다. (${parsedBlocks.length}개 블록)`, 2500);
            }
          }
        }
      }

      const srcUrl = await detectClipboardSourceUrl(e.clipboardData);
      if (srcUrl) {
        appendOneNoteSourceLinkToActiveNote(srcUrl, targetBlockId);
      }
    }
  });

  // Quick URL Summarize Bar in Note List View
  const triggerListQuickUrl = async () => {
    const inp = document.getElementById('list-quick-url-input');
    if (!inp) return;
    const url = inp.value.trim();
    if (!url) return showToast('요약할 웹 주소(URL)를 입력하거나 붙여넣어 주세요.');
    inp.value = '';
    await clipAndSummarizeUrl(url, { summarize: true, openEditor: false });
  };
  document.getElementById('btn-list-url-summarize')?.addEventListener('click', triggerListQuickUrl);
  document.getElementById('list-quick-url-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerListQuickUrl();
    }
  });

  document.getElementById('image-upload-input').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) insertImageFileIntoNote(file);
  });

  // App Lock Unlock
  document.getElementById('app-lock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('app-lock-input').value;
    const verifier = state.settings.appLockVerifier || state.settings.vaultMasterVerifier;
    const ok = verifier ? await VaultCrypto.verifyPassword(pass, verifier) : true;
    const errEl = document.getElementById('app-lock-error');
    if (ok) {
      errEl.classList.add('hidden');
      document.getElementById('app-lock-overlay').classList.add('hidden');
    } else {
      errEl.classList.remove('hidden');
    }
  });

  const handleEmergencyWipe = async () => {
    if (!confirm('이 기기(브라우저)에 저장된 모든 로컬 데이터를 삭제하시겠습니까?')) return;
    await VaultStorage.wipeAllLocalData();
    location.reload();
  };
  document.getElementById('btn-emergency-wipe-lock').addEventListener('click', handleEmergencyWipe);
  document.getElementById('btn-wipe-local-device').addEventListener('click', handleEmergencyWipe);

  // Sidebar Navigation Click -> Show Note List View!
  document.querySelectorAll('.nav-group .nav-item[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectCategoryNav(btn.dataset.nav);
    });
  });

  document.getElementById('btn-add-folder').addEventListener('click', () => {
    const name = prompt('새 폴더 이름:');
    if (!name || !name.trim()) return;
    const newFolder = { id: uid('folder'), name: name.trim() };
    state.folders.push(newFolder);
    scheduleSave();
    selectCategoryNav(`folder:${newFolder.id}`);
  });

  document.getElementById('btn-topbar-new-note')?.addEventListener('click', () => createNewNote());
  document.getElementById('btn-empty-create-note')?.addEventListener('click', () => createNewNote());

  document.getElementById('btn-empty-trash').addEventListener('click', () => {
    if (!confirm('휴지통의 모든 노트를 영구 삭제하시겠습니까?')) return;
    lastLocalMutationTime = Date.now();
    state.notes = state.notes.filter((n) => !n.trashed);
    activeNoteId = state.notes[0]?.id || null;
    activeViewMode = 'list';
    scheduleSave(true, true);
    renderAll(false, true);
    showToast('휴지통을 비웠습니다.');
  });

  // Topbar View Segment
  document.querySelectorAll('.view-Segment .seg-btn[data-viewmode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeViewMode = btn.dataset.viewmode;
      if (['vault', 'graph', 'clipper'].includes(activeNav)) activeNav = 'all';
      if (activeViewMode === 'editor' && !activeNoteId) {
        const first = getFilteredNotes()[0];
        if (first) activeNoteId = first.id;
      }
      renderAll();
      pullLiveSyncStateIfNewer(false);
    });
  });

  document.getElementById('btn-close-split').addEventListener('click', () => {
    activeViewMode = 'editor';
    renderAll();
  });

  // Split View Searchable Note Picker events
  const splitSearchInp = document.getElementById('split-note-search-input');
  const btnClearSplitSearch = document.getElementById('btn-clear-split-search');
  const splitDropdown = document.getElementById('split-picker-dropdown');

  if (splitSearchInp && splitDropdown) {
    splitSearchInp.addEventListener('focus', () => {
      renderSplitPickerDropdown(splitSearchInp.value.trim());
      splitDropdown.classList.remove('hidden');
      setTimeout(() => splitSearchInp.select(), 10);
    });

    splitSearchInp.addEventListener('input', () => {
      const val = splitSearchInp.value.trim();
      if (btnClearSplitSearch) btnClearSplitSearch.classList.toggle('hidden', !val);
      renderSplitPickerDropdown(val);
      splitDropdown.classList.remove('hidden');
    });

    splitSearchInp.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        splitDropdown.classList.add('hidden');
        splitSearchInp.blur();
        const secNote = state.notes.find((n) => n.id === secondaryNoteId);
        splitSearchInp.value = secNote ? (secNote.title || '제목 없음') : '';
        if (btnClearSplitSearch) btnClearSplitSearch.classList.toggle('hidden', !splitSearchInp.value);
      } else if (e.key === 'Enter') {
        const firstItem = splitDropdown.querySelector('.split-picker-item');
        if (firstItem) {
          firstItem.click();
          splitSearchInp.blur();
        }
      }
    });

    if (btnClearSplitSearch) {
      btnClearSplitSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        splitSearchInp.value = '';
        btnClearSplitSearch.classList.add('hidden');
        splitSearchInp.focus();
        renderSplitPickerDropdown('');
        splitDropdown.classList.remove('hidden');
      });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!splitDropdown.classList.contains('hidden')) {
        const wrap = document.getElementById('split-picker-wrap');
        if (wrap && !wrap.contains(e.target)) {
          splitDropdown.classList.add('hidden');
          const secNote = state.notes.find((n) => n.id === secondaryNoteId);
          splitSearchInp.value = secNote ? (secNote.title || '제목 없음') : '';
          if (btnClearSplitSearch) btnClearSplitSearch.classList.toggle('hidden', !splitSearchInp.value);
        }
      }
    });
  }

  // Sidebar & List View Search Inputs + Instant Clear Buttons ('✕')
  const sidebarInp = document.getElementById('inline-filter-input');
  const listSearchInp = document.getElementById('list-view-search');
  const btnClearSidebar = document.getElementById('btn-clear-inline-filter');
  const btnClearList = document.getElementById('btn-clear-list-search');

  function updateSearchClearButtons() {
    const sVal = (sidebarInp?.value || '').trim();
    const lVal = (listSearchInp?.value || '').trim();
    if (btnClearSidebar) btnClearSidebar.classList.toggle('hidden', !sVal);
    if (btnClearList) btnClearList.classList.toggle('hidden', !lVal);
  }

  sidebarInp?.addEventListener('input', (e) => {
    if (listSearchInp && listSearchInp.value !== e.target.value) listSearchInp.value = e.target.value;
    updateSearchClearButtons();
    if (activeViewMode !== 'list') activeViewMode = 'list';
    renderAll();
  });

  listSearchInp?.addEventListener('input', (e) => {
    if (sidebarInp && sidebarInp.value !== e.target.value) sidebarInp.value = e.target.value;
    updateSearchClearButtons();
    renderMainNoteListView();
    renderSidebar();
  });

  const clearAllSearchInputs = () => {
    if (sidebarInp) sidebarInp.value = '';
    if (listSearchInp) listSearchInp.value = '';
    updateSearchClearButtons();
    clearSearchHighlights();
    renderMainNoteListView();
    renderSidebar();
  };

  btnClearSidebar?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearAllSearchInputs();
    sidebarInp?.focus();
  });

  btnClearList?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearAllSearchInputs();
    listSearchInp?.focus();
  });

  // Global Search in Modal + Clear Button
  const globalInp = document.getElementById('global-search-input');
  const btnClearGlobal = document.getElementById('btn-clear-global-search');
  globalInp?.addEventListener('input', () => {
    if (btnClearGlobal) btnClearGlobal.classList.toggle('hidden', !globalInp.value.trim());
  });
  btnClearGlobal?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (globalInp) {
      globalInp.value = '';
      btnClearGlobal.classList.add('hidden');
      renderGlobalSearchResults('');
      globalInp.focus();
    }
  });

  // Floating Formatting Toolbar Listeners (Touch & Mouse Support)
  const formatToolbar = document.getElementById('floating-format-toolbar');
  // Crucial: prevent touchstart/mousedown from blurring the textarea on mobile!
  formatToolbar?.addEventListener('mousedown', (e) => e.preventDefault());
  formatToolbar?.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  formatToolbar?.querySelectorAll('[data-format]').forEach((btn) => {
    const runFormat = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyFormattingToActiveSelection(btn.dataset.format);
    };
    btn.addEventListener('click', runFormat);
    btn.addEventListener('touchend', runFormat);
  });

  const btnToggleColor = document.getElementById('btn-toggle-color-picker');
  const palette = document.getElementById('format-color-palette');
  const runToggleColor = (e) => {
    e.preventDefault();
    e.stopPropagation();
    palette?.classList.toggle('hidden');
  };
  btnToggleColor?.addEventListener('click', runToggleColor);
  btnToggleColor?.addEventListener('touchend', runToggleColor);

  palette?.querySelectorAll('.color-dot').forEach((dot) => {
    const runColor = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyFormattingToActiveSelection('color', null, dot.dataset.color || '');
    };
    dot.addEventListener('click', runColor);
    dot.addEventListener('touchend', runColor);
  });

  // Mobile Format Accessory Bar Listeners
  const mobileBar = document.getElementById('mobile-format-accessory-bar');
  mobileBar?.addEventListener('mousedown', (e) => e.preventDefault());
  mobileBar?.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

  mobileBar?.querySelectorAll('[data-format]').forEach((btn) => {
    const runMobileFormat = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyFormattingToActiveSelection(btn.dataset.format);
    };
    btn.addEventListener('click', runMobileFormat);
    btn.addEventListener('touchend', runMobileFormat);
  });

  const btnMobileColor = document.getElementById('btn-mobile-color');
  const mobilePalette = document.getElementById('mobile-format-color-palette');
  const toggleMobileColor = (e) => {
    e.preventDefault();
    e.stopPropagation();
    mobilePalette?.classList.toggle('hidden');
  };
  btnMobileColor?.addEventListener('click', toggleMobileColor);
  btnMobileColor?.addEventListener('touchend', toggleMobileColor);

  mobilePalette?.querySelectorAll('.color-dot').forEach((dot) => {
    const runMobileColor = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyFormattingToActiveSelection('color', null, dot.dataset.color || '');
    };
    dot.addEventListener('click', runMobileColor);
    dot.addEventListener('touchend', runMobileColor);
  });

  const btnFloatingIndent = document.getElementById('btn-floating-indent');
  const btnFloatingOutdent = document.getElementById('btn-floating-outdent');
  const handleFloatingIndent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    indentActiveBlock(1);
  };
  const handleFloatingOutdent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    indentActiveBlock(-1);
  };
  btnFloatingIndent?.addEventListener('click', handleFloatingIndent);
  btnFloatingIndent?.addEventListener('touchend', handleFloatingIndent);
  btnFloatingOutdent?.addEventListener('click', handleFloatingOutdent);
  btnFloatingOutdent?.addEventListener('touchend', handleFloatingOutdent);

  const btnMobileIndent = document.getElementById('btn-mobile-indent');
  const btnMobileOutdent = document.getElementById('btn-mobile-outdent');
  btnMobileIndent?.addEventListener('click', handleFloatingIndent);
  btnMobileIndent?.addEventListener('touchend', handleFloatingIndent);
  btnMobileOutdent?.addEventListener('click', handleFloatingOutdent);
  btnMobileOutdent?.addEventListener('touchend', handleFloatingOutdent);

  document.getElementById('btn-mobile-hide-bar')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideMobileAccessoryBar();
  });

  // Reposition floating toolbar on scroll and on virtual keyboard resize/scroll
  window.addEventListener('scroll', () => {
    if (activeFormattedTextarea) repositionFloatingFormatToolbar();
  }, { passive: true, capture: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (activeFormattedTextarea) repositionFloatingFormatToolbar();
    });
    window.visualViewport.addEventListener('scroll', () => {
      if (activeFormattedTextarea) repositionFloatingFormatToolbar();
    });
  }

  const hideToolbarIfOutside = (e) => {
    if (e.target.closest('#floating-format-toolbar')) return;
    if (e.target.closest('.block-editable')) return;
    setTimeout(() => {
      if (!activeFormattedTextarea || activeFormattedTextarea.selectionStart === activeFormattedTextarea.selectionEnd) {
        hideFloatingFormatToolbar();
      }
    }, 120);
  };
  document.addEventListener('mousedown', hideToolbarIfOutside);
  document.addEventListener('touchend', hideToolbarIfOutside);

  document.getElementById('sort-select').addEventListener('change', () => {
    renderMainNoteListView();
    renderSidebar();
  });

  // Title Input & Preview
  const titlePreviewEl = document.getElementById('note-title-preview');
  const titleInputEl = document.getElementById('note-title-input');
  titlePreviewEl?.addEventListener('click', () => {
    titlePreviewEl.classList.add('hidden');
    titleInputEl?.classList.remove('hidden');
    titleInputEl?.focus();
  });

  titleInputEl?.addEventListener('input', (e) => {
    clearSearchHighlights();
    const note = getActiveNote();
    if (!note) return;
    note.title = e.target.value.replace(/\r?\n/g, ' ');
    if (e.target.value !== note.title) e.target.value = note.title;
    autoResizeTextarea(e.target);
    touchNote(note);
  });
  titleInputEl?.addEventListener('keydown', (e) => {
    clearSearchHighlights();
    if (e.key === 'Enter') {
      e.preventDefault();
      const note = getActiveNote();
      const blocks = getEditableBlocksForNote(note);
      if (!note || !blocks) return;
      if (blocks.length === 0 || (blocks[0] && blocks[0].text && blocks[0].text.trim().length > 0)) {
        // 본문 첫 줄에 이미 내용이 있으면 본문 맨 위에 새 빈 줄을 삽입하고 그곳으로 포커스
        const newBlock = { id: uid('b'), type: 'p', text: '', checked: false, indent: 0 };
        blocks.unshift(newBlock);
        touchNote(note, blocks);
        renderActiveNoteEditor();
        focusBlock(newBlock.id);
      } else if (blocks[0]) {
        // 본문 첫 줄이 이미 비어있다면 바로 그곳으로 포커스
        focusBlock(blocks[0].id);
      }
    }
  });

  // 에디터 본문 수정 시 검색 하이라이트 자동 해제
  document.getElementById('blocks-container')?.addEventListener('input', clearSearchHighlights);
  document.getElementById('blocks-container')?.addEventListener('keydown', clearSearchHighlights);

  document.getElementById('btn-summarize-note')?.addEventListener('click', () => {
    summarizeCurrentActiveNote();
  });

  document.getElementById('btn-open-note-graph')?.addEventListener('click', () => {
    const note = getActiveNote();
    if (note) {
      graphCenterNoteId = note.id;
    }
    graphViewMode = 'local';
    selectCategoryNav('graph');
  });

  document.getElementById('btn-toggle-fav').addEventListener('click', () => {
    const note = getActiveNote();
    if (!note) return;
    note.favorite = !note.favorite;
    touchNote(note);
    renderAll();
  });

  document.getElementById('note-folder-select').addEventListener('change', (e) => {
    const note = getActiveNote();
    if (!note) return;
    note.folderId = e.target.value;
    touchNote(note);
    renderAll();
  });

  document.getElementById('note-status-select').addEventListener('change', (e) => {
    const note = getActiveNote();
    if (!note) return;
    note.status = e.target.value;
    touchNote(note);
  });

  // Tag Popover (Notion-style) Listeners
  document.getElementById('btn-open-tag-popover')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const pop = document.getElementById('note-tag-popover');
    if (!pop) return;
    const isHidden = pop.classList.contains('hidden');
    if (isHidden) {
      pop.classList.remove('hidden');
      const inp = document.getElementById('note-tag-popover-input');
      setTimeout(() => inp?.focus(), 40);
    } else {
      pop.classList.add('hidden');
    }
  });

  document.getElementById('btn-submit-tag-popover')?.addEventListener('click', (e) => {
    e.stopPropagation();
    commitPopoverTags();
  });

  document.getElementById('note-tag-popover-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitPopoverTags();
    }
  });

  // 바깥 터치/클릭 시 태그 말풍선 자동 닫기
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.tag-popover-wrap')) {
      closeTagPopover();
    }
  });

  // Note Encryption Toggle (Verified against master key if set)
  document.getElementById('btn-toggle-note-encrypt').addEventListener('click', async () => {
    const note = getActiveNote();
    if (!note) return;

    if (!note.isEncrypted) {
      let pass = unlockedVaultPassword;
      if (!pass) {
        pass = prompt('노트를 암호화하여 잠글 마스터 비밀번호를 입력하세요:');
        if (!pass) return;
        if (state.settings.vaultMasterVerifier) {
          const valid = await VaultCrypto.verifyPassword(pass, state.settings.vaultMasterVerifier);
          if (!valid) return showToast('기존 마스터 비밀번호와 일치하지 않습니다.');
        } else {
          state.settings.vaultMasterVerifier = await VaultCrypto.createVerifier(pass);
        }
      }
      const encrypted = await VaultCrypto.encryptData(note.blocks || [], pass);
      // Immediately lock the note on screen so the content is hidden behind the password gate
      decryptedNotesSessionMap.delete(note.id);
      note.encryptedPayload = encrypted;
      note.blocks = [];
      note.isEncrypted = true;
      unlockedVaultPassword = pass;
      scheduleSave();
      renderAll();
      setTimeout(() => document.getElementById('note-decrypt-pass')?.focus(), 20);
      showToast('노트가 AES-256으로 암호화되어 잠겼습니다. 비밀번호를 입력해야 열람됩니다.');
    } else {
      const blocks = getEditableBlocksForNote(note);
      if (!blocks) return showToast('먼저 노트를 열람한 뒤 해제할 수 있습니다.');
      note.blocks = blocks;
      delete note.encryptedPayload;
      note.isEncrypted = false;
      decryptedNotesSessionMap.delete(note.id);
      scheduleSave();
      renderAll();
      showToast('노트 암호화 잠금이 완전히 해제되었습니다.');
    }
  });

  document.getElementById('btn-relock-note')?.addEventListener('click', () => {
    const note = getActiveNote();
    if (!note || !note.isEncrypted) return;
    decryptedNotesSessionMap.delete(note.id);
    renderAll();
    setTimeout(() => document.getElementById('note-decrypt-pass')?.focus(), 20);
    showToast('노트 화면이 다시 잠겼습니다.');
  });

  const handleUnlockEncryptedNote = async () => {
    const note = getActiveNote();
    const pass = document.getElementById('note-decrypt-pass').value;
    if (!note || !pass) return;
    try {
      const decBlocks = await VaultCrypto.decryptData(note.encryptedPayload, pass);
      decryptedNotesSessionMap.set(note.id, decBlocks);
      unlockedVaultPassword = pass;
      document.getElementById('note-decrypt-pass').value = '';
      renderActiveNoteEditor();
      showToast('노트 잠금이 해제되어 내용을 표시합니다.');
    } catch {
      showToast('비밀번호가 일치하지 않습니다.');
    }
  };
  document.getElementById('btn-unlock-encrypted-note').addEventListener('click', handleUnlockEncryptedNote);
  document.getElementById('note-decrypt-pass')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUnlockEncryptedNote();
    }
  });

  document.getElementById('btn-export-md').addEventListener('click', () => {
    const note = getActiveNote();
    if (!note) return;
    const files = VaultStorage.notesToMarkdownFiles([note], state.folders);
    if (!files[0]) return;
    const blob = new Blob([files[0].content], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${note.title || 'note'}.md`;
    a.click();
  });

  document.getElementById('btn-restore-note').addEventListener('click', () => {
    const note = getActiveNote();
    if (!note) return;
    lastLocalMutationTime = Date.now();
    note.trashed = false;
    note.updatedAt = new Date().toISOString();
    scheduleSave(true, true);
    renderAll();
    showToast('노트가 복원되었습니다.');
  });

  document.getElementById('btn-delete-note').addEventListener('click', () => {
    const note = getActiveNote();
    if (!note) return;
    const deletedId = note.id;
    lastLocalMutationTime = Date.now();
    if (note.trashed) {
      state.notes = state.notes.filter((n) => n.id !== note.id);
      showToast('영구 삭제되었습니다.');
    } else {
      note.trashed = true;
      note.updatedAt = new Date().toISOString();
      lastTrashedNoteIds.push(note.id);
      showToast('휴지통으로 이동되었습니다.', 5000, '↩ 되돌리기', () => {
        undoLastNoteTrash();
      });
    }
    // 기존 DOM 목록에서 삭제된 노트 요소 즉시 제거하여 화면 전환 시 잔상(Flicker) 원천 방지
    document.querySelectorAll(`.main-note-item[data-note-id="${deletedId}"], [data-quick-note-id="${deletedId}"]`).forEach((el) => el.remove());
    const remaining = getFilteredNotes();
    activeNoteId = remaining[0]?.id || null;
    activeViewMode = 'list';
    scheduleSave(true, true);
    renderAll(false, true);
  });

  // Slash Menu Items (Block Type & Block Action)
  document.querySelectorAll('#slash-menu .slash-item[data-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (slashTargetBlockId) applyBlockType(slashTargetBlockId, btn.dataset.type);
    });
  });
  document.querySelectorAll('#slash-menu .slash-item[data-blockact]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (slashTargetBlockId) executeBlockAction(slashTargetBlockId, btn.dataset.blockact);
    });
  });

  // Scratchpad
  document.getElementById('btn-Quick-Scratchpad').addEventListener('click', () => {
    document.getElementById('scratchpad-drawer').classList.toggle('hidden');
  });
  document.getElementById('btn-close-scratchpad').addEventListener('click', () => {
    document.getElementById('scratchpad-drawer').classList.add('hidden');
  });
  document.getElementById('scratchpad-textarea').addEventListener('input', (e) => {
    state.scratchpad = e.target.value;
    scheduleSave(false);
  });

  // Fullscreen Toggle (스마트폰 & 노트북 공용)
  const btnFullscreen = document.getElementById('btn-toggle-fullscreen');
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }

  function updateFullscreenUI() {
    if (!btnFullscreen) return;
    const active = isFullscreen();
    const icon = btnFullscreen.querySelector('.fs-icon');
    const text = btnFullscreen.querySelector('.fs-text');
    if (active) {
      if (icon) icon.textContent = '🗗';
      if (text) text.textContent = ' 복귀';
      btnFullscreen.title = '전체화면 해제 (Esc / F11)';
      btnFullscreen.classList.add('active');
    } else {
      if (icon) icon.textContent = '⛶';
      if (text) text.textContent = ' 전체';
      btnFullscreen.title = '전체화면 전환 (F11)';
      btnFullscreen.classList.remove('active');
    }
  }

  async function toggleFullscreen() {
    try {
      if (!isFullscreen()) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('전체화면 전환 오류:', err);
      showToast('전체화면 모드를 전환할 수 없습니다: ' + (err.message || '브라우저 권한 제한'));
    }
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((ev) => {
      document.addEventListener(ev, updateFullscreenUI);
    });
    updateFullscreenUI();
  }

  // Topbar More Dropdown Menu (방안 2: 모바일 / 스마트폰 외부화면)
  const btnMore = document.getElementById('btn-topbar-more');
  const dropdownMore = document.getElementById('topbar-more-dropdown');

  if (btnMore && dropdownMore) {
    btnMore.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMore.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!dropdownMore.contains(e.target) && e.target !== btnMore) {
        dropdownMore.classList.add('hidden');
      }
    });

    document.getElementById('more-item-scratchpad')?.addEventListener('click', () => {
      dropdownMore.classList.add('hidden');
      document.getElementById('scratchpad-drawer')?.classList.toggle('hidden');
    });

    document.getElementById('more-item-theme')?.addEventListener('click', () => {
      dropdownMore.classList.add('hidden');
      const current = localStorage.getItem('vaultnote_theme') || state.settings?.theme || 'dark';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('vaultnote_theme', nextTheme); } catch (_) {}
      state.settings.theme = nextTheme;
      document.documentElement.setAttribute('data-theme', nextTheme);
      scheduleSave(false);
      renderAll();
    });

    document.getElementById('more-item-width')?.addEventListener('click', () => {
      dropdownMore.classList.add('hidden');
      state.settings.fullWidth = !state.settings.fullWidth;
      scheduleSave(false);
      renderAll();
    });

    dropdownMore.querySelectorAll('button[data-more-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dropdownMore.classList.add('hidden');
        activeViewMode = btn.dataset.moreView;
        if (['vault', 'graph', 'clipper'].includes(activeNav)) activeNav = 'all';
        if (activeViewMode === 'editor' && !activeNoteId) {
          const first = getFilteredNotes()[0];
          if (first) activeNoteId = first.id;
        }
        renderAll();
      });
    });
  }
  document.getElementById('btn-promote-scratchpad').addEventListener('click', () => {
    const text = (state.scratchpad || '').trim();
    if (!text) return;
    const lines = text.split('\n').filter(Boolean);
    const title = lines[0]?.slice(0, 50) || '빠른 메모';
    const now = new Date().toISOString();
    const newNote = {
      id: uid('note'),
      title,
      folderId: state.folders[0]?.id || 'f_work',
      docType: 'note',
      status: '',
      priority: 'normal',
      favorite: false,
      trashed: false,
      isEncrypted: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
      blocks: lines.map((l) => ({ id: uid('b'), type: 'p', text: l }))
    };
    state.notes.unshift(newNote);
    openNoteInEditor(newNote.id);
    scheduleSave();
    showToast('정식 노트로 변환되었습니다.');
  });

  // Secure Vault
  document.getElementById('vault-unlock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('vault-master-input').value;
    const errEl = document.getElementById('vault-error-msg');
    if (!state.settings.vaultMasterVerifier) {
      state.settings.vaultMasterVerifier = await VaultCrypto.createVerifier(pass);
      unlockedVaultPassword = pass;
      scheduleSave();
      errEl.classList.add('hidden');
      document.getElementById('vault-master-input').value = '';
      renderSecureVaultView();
    } else {
      const ok = await VaultCrypto.verifyPassword(pass, state.settings.vaultMasterVerifier);
      if (ok) {
        unlockedVaultPassword = pass;
        errEl.classList.add('hidden');
        document.getElementById('vault-master-input').value = '';
        renderSecureVaultView();
      } else {
        errEl.classList.remove('hidden');
      }
    }
  });

  document.getElementById('btn-lock-vault').addEventListener('click', () => {
    unlockedVaultPassword = null;
    decryptedVaultItemsCache = [];
    renderSecureVaultView();
  });

  document.querySelectorAll('.vault-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vault-cat-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeVaultCategory = btn.dataset.vcat;
      renderSecureVaultView();
    });
  });

  document.getElementById('btn-add-vault-item').addEventListener('click', () => {
    if (!unlockedVaultPassword) return showToast('먼저 금고 비밀번호를 입력해 잠금을 해제하세요.');
    document.getElementById('vault-item-modal').classList.remove('hidden');
  });
  document.getElementById('btn-close-vault-item-modal').addEventListener('click', () => {
    document.getElementById('vault-item-modal').classList.add('hidden');
  });
  document.getElementById('vault-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!unlockedVaultPassword) return;
    const payload = {
      category: document.getElementById('vi-category').value,
      title: document.getElementById('vi-title').value.trim(),
      username: document.getElementById('vi-username').value.trim(),
      secret: document.getElementById('vi-secret').value,
      url: document.getElementById('vi-url').value.trim(),
      notes: document.getElementById('vi-notes').value.trim()
    };
    const encryptedPayload = await VaultCrypto.encryptData(payload, unlockedVaultPassword);
    state.vaultItems.unshift({
      id: uid('vi'),
      createdAt: new Date().toISOString(),
      encryptedPayload
    });
    e.target.reset();
    document.getElementById('vault-item-modal').classList.add('hidden');
    scheduleSave();
    renderSecureVaultView();
  });

  // Graph Controls & Canvas Click
  document.getElementById('btn-graph-mode-local')?.addEventListener('click', () => {
    graphViewMode = 'local';
    if (!graphCenterNoteId && activeNoteId) graphCenterNoteId = activeNoteId;
    renderKnowledgeGraph();
  });
  document.getElementById('btn-graph-mode-global')?.addEventListener('click', () => {
    graphViewMode = 'global';
    renderKnowledgeGraph();
  });
  document.getElementById('graph-center-note-select')?.addEventListener('change', (e) => {
    graphCenterNoteId = e.target.value;
    activeNoteId = e.target.value;
    graphViewMode = 'local';
    renderKnowledgeGraph();
  });
  document.getElementById('btn-graph-open-center')?.addEventListener('click', () => {
    const targetId = graphCenterNoteId || activeNoteId;
    if (targetId) openNoteInEditor(targetId);
  });

  document.getElementById('knowledge-graph-canvas').addEventListener('click', (e) => {
    const rect = e.target.getBoundingClientRect();
    const scaleX = e.target.width / rect.width;
    const scaleY = e.target.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    for (const node of graphNodePositions) {
      if (Math.hypot(x - node.x, y - node.y) <= node.r + 12) {
        openNoteInEditor(node.note.id);
        break;
      }
    }
  });

  // Web Clipper
  document.getElementById('btn-fetch-url-clip').addEventListener('click', async () => {
    const url = document.getElementById('clipper-url-input').value.trim();
    if (!url) return;
    const summarize = document.getElementById('chk-clipper-summarize')?.checked !== false;
    const targetFolderId = document.getElementById('clipper-target-folder')?.value || 'f_clip';
    document.getElementById('clipper-url-input').value = '';
    await clipAndSummarizeUrl(url, { summarize, openEditor: true, targetFolderId });
  });

  document.getElementById('btn-save-clip').addEventListener('click', async () => {
    const pasteZone = document.getElementById('clipper-paste-zone');
    const customTitle = document.getElementById('clipper-custom-title').value.trim();
    const sourceUrl = document.getElementById('clipper-source-url').value.trim();
    const summarize = document.getElementById('chk-clipper-summarize')?.checked !== false;
    const html = pasteZone.innerHTML.trim();
    if (!html) return showToast('붙여넣은 내용이 없습니다.');
    const parsed = parseHtmlToBlocks(html, sourceUrl);
    const noteTitle = customTitle || parsed.title || '웹 클리핑';
    let finalBlocks = parsed.blocks;
    let tags = ['클리핑'];
    if (summarize) {
      let sumResult = null;
      if ((state.settings.geminiApiKey || '').trim()) {
        try {
          sumResult = await summarizeWithGeminiAI(noteTitle, parsed.blocks, sourceUrl, false);
        } catch {
          sumResult = null;
        }
      }
      if (!sumResult) {
        sumResult = summarizeExtractedArticle(noteTitle, parsed.blocks, sourceUrl);
      }
      finalBlocks = sumResult.blocks;
      tags = ['요약', '클리핑', ...sumResult.autoTags.filter(isMeaningfulTopicTag)];
    }
    const now = new Date().toISOString();
    const newNote = {
      id: uid('note'),
      title: noteTitle,
      folderId: document.getElementById('clipper-target-folder').value || 'f_clip',
      docType: 'clip',
      status: '',
      priority: 'normal',
      favorite: false,
      trashed: false,
      isEncrypted: false,
      tags,
      createdAt: now,
      updatedAt: now,
      blocks: finalBlocks
    };
    state.notes.unshift(newNote);
    pasteZone.innerHTML = '';
    document.getElementById('clipper-custom-title').value = '';
    document.getElementById('clipper-source-url').value = '';
    scheduleSave();
    openNoteInEditor(newNote.id);
    showToast('노트로 요약 저장되었습니다.');
  });

  // Search Modal
  document.getElementById('btn-close-search').addEventListener('click', () => {
    document.getElementById('search-modal').classList.add('hidden');
  });
  document.getElementById('global-search-input').addEventListener('input', renderGlobalSearchResults);

  // Cloud Sync Modal
  const refreshOneDriveSyncBadge = async () => {
    const badge = document.getElementById('onedrive-sync-status-badge');
    if (!badge) return;
    const hasGdrive = Boolean((state.settings.gdriveToken || '').trim());
    const hasToken = Boolean((state.settings.onedriveToken || '').trim());
    const hasDirHandle = await VaultStorage.restoreBrowserDirectoryHandle();
    const hasPcDir = Boolean((state.settings.pcVaultDir || '').trim());
    if (hasGdrive || hasToken || hasDirHandle || hasPcDir) {
      const modeLabel = hasGdrive
        ? '자동 동기화 켜짐 (Google Drive 영구 연결)'
        : hasToken && (hasDirHandle || hasPcDir)
        ? '자동 동기화 켜짐 (PC 폴더 + 스마트폰 API)'
        : hasToken
        ? '자동 동기화 켜짐 (OneDrive API)'
        : '자동 동기화 켜짐 (원드라이브 폴더)';
      badge.textContent = modeLabel;
      badge.style.background = '#e8f5e9';
      badge.style.color = '#1b5e20';
    } else {
      badge.textContent = '연결 대기 중';
      badge.style.background = '#f0f0ed';
      badge.style.color = '#666';
    }
  };

  document.getElementById('btn-cloud-sync-modal').addEventListener('click', () => {
    const odEl = document.getElementById('onedrive-token-input');
    if (odEl) odEl.value = state.settings.onedriveToken || '';
    const gdEl = document.getElementById('gdrive-token-input');
    if (gdEl) gdEl.value = state.settings.gdriveToken || '';
    refreshOneDriveSyncBadge();
    document.getElementById('cloud-sync-modal').classList.remove('hidden');
  });
  document.getElementById('btn-close-cloud-modal').addEventListener('click', () => {
    document.getElementById('cloud-sync-modal').classList.add('hidden');
  });

  document.getElementById('onedrive-token-input')?.addEventListener('change', (e) => {
    state.settings.onedriveToken = e.target.value.trim();
    scheduleSave(false);
    refreshOneDriveSyncBadge();
  });

  document.getElementById('gdrive-token-input')?.addEventListener('change', (e) => {
    state.settings.gdriveToken = e.target.value.trim();
    scheduleSave(false);
  });

  document.getElementById('detected-cloud-folders').addEventListener('change', (e) => {
    if (e.target.value) {
      document.getElementById('custom-vault-dir-input').value = e.target.value;
      state.settings.pcVaultDir = e.target.value;
      scheduleSave(false);
      refreshOneDriveSyncBadge();
    }
  });

  document.getElementById('chk-auto-pc-sync').addEventListener('change', (e) => {
    state.settings.autoPcSync = e.target.checked;
    scheduleSave(false);
  });

  document.getElementById('btn-pick-custom-folder').addEventListener('click', async () => {
    try {
      const folderName = await VaultStorage.pickBrowserDirectory();
      const existing = await VaultStorage.loadFromBrowserDirectory();
      if (existing && Array.isArray(existing.notes) && existing.notes.length > 0 && (existing.lastSavedAt || 0) > (state.lastSavedAt || 0)) {
        await applyRemoteSyncedState(existing, Date.now());
        showToast(`'${folderName}' 폴더의 최신 원드라이브 노트를 불러오고 자동 동기화를 연결했습니다.`);
      } else {
        state.lastSavedAt = Date.now();
        await VaultStorage.saveToBrowserDirectory(state);
        showToast(`'${folderName}' 원드라이브 폴더와 자동 동기화가 연결되었습니다.`);
      }
      refreshOneDriveSyncBadge();
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById('btn-sync-pc-save').addEventListener('click', async () => {
    const dir = document.getElementById('custom-vault-dir-input').value.trim() || state.settings.pcVaultDir;
    if (!dir) return showToast('동기화 폴더 경로를 지정해주세요.');
    state.settings.pcVaultDir = dir;
    state.lastSavedAt = Date.now();
    try {
      const res = await VaultStorage.syncWithPCFolder(dir, state, 'save');
      if (res.ok) showToast(`원드라이브 폴더 저장 완료: ${res.file}`);
      else showToast(`오류: ${res.error}`);
      refreshOneDriveSyncBadge();
    } catch {
      exportVaultJsonFile();
    }
  });

  document.getElementById('btn-sync-pc-load').addEventListener('click', async () => {
    const dir = document.getElementById('custom-vault-dir-input').value.trim();
    if (!dir) return;
    const res = await VaultStorage.syncWithPCFolder(dir, state, 'load');
    if (res.ok && res.data) {
      await applyRemoteSyncedState(res.data, Date.now());
      showToast('원드라이브 폴더에서 데이터를 불러왔습니다.');
      refreshOneDriveSyncBadge();
    } else {
      showToast(res.message || res.error || '불러오기 실패');
    }
  });

  // Helper to determine if the local device has user-created notes or only empty default welcome notes
  const isLocalDeviceFreshOrEmpty = () => {
    if (!state.notes || state.notes.length === 0) return true;
    const userNotes = state.notes.filter(
      (n) => !n.trashed && n.id !== 'n_welcome' && n.id !== 'n_security_sync'
    );
    return userNotes.length === 0;
  };

  const handleSmartSyncOneDrive = async () => {
    const token = document.getElementById('onedrive-token-input').value.trim();
    if (!token) return showToast('OneDrive 토큰을 입력하세요.');
    state.settings.onedriveToken = token;
    showToast('OneDrive 저장 상태 확인 중...');
    try {
      const remote = await VaultStorage.syncOneDriveAPI(token, state, 'load');
      const remoteHasNotes = remote && Array.isArray(remote.notes) && remote.notes.length > 0;
      if (remoteHasNotes && (isLocalDeviceFreshOrEmpty() || (remote.notes.length > state.notes.length))) {
        remote.settings = { ...(remote.settings || {}), onedriveToken: token };
        await applyRemoteSyncedState(remote, 'OneDrive에서 불러옴');
        showToast(`기존 OneDrive의 ${remote.notes.length}개 노트를 안전하게 불러왔습니다!`);
      } else {
        state.lastSavedAt = Date.now();
        await VaultStorage.saveState(state);
        await VaultStorage.syncOneDriveAPI(token, state, 'save');
        showToast('OneDrive에 동기화 저장 및 자동 동기화 연결 완료');
      }
      refreshOneDriveSyncBadge();
    } catch (err) {
      showToast(`OneDrive 오류: ${err.message}`);
    }
  };

  document.getElementById('btn-onedrive-smart-sync')?.addEventListener('click', handleSmartSyncOneDrive);

  document.getElementById('btn-onedrive-push').addEventListener('click', async () => {
    const token = document.getElementById('onedrive-token-input').value.trim();
    if (!token) return showToast('OneDrive 토큰을 입력하세요.');
    state.settings.onedriveToken = token;
    state.lastSavedAt = Date.now();
    await VaultStorage.saveState(state);
    refreshOneDriveSyncBadge();
    try {
      await VaultStorage.syncOneDriveAPI(token, state, 'save');
      showToast('OneDrive로 내보내기(업로드) 완료');
    } catch (err) {
      showToast(`OneDrive 오류: ${err.message}`);
    }
  });

  document.getElementById('btn-onedrive-pull').addEventListener('click', async () => {
    const token = document.getElementById('onedrive-token-input').value.trim();
    if (!token) return showToast('OneDrive 토큰을 입력하세요.');
    state.settings.onedriveToken = token;
    await VaultStorage.saveState(state);
    refreshOneDriveSyncBadge();
    try {
      const remote = await VaultStorage.syncOneDriveAPI(token, state, 'load');
      if (remote && Array.isArray(remote.notes) && remote.notes.length > 0) {
        remote.settings = { ...(remote.settings || {}), onedriveToken: token };
        await applyRemoteSyncedState(remote, 'OneDrive에서 불러옴');
        showToast(`OneDrive에서 ${remote.notes.length}개의 노트를 불러왔습니다.`);
      } else {
        showToast('OneDrive에 저장된 노트 파일이 없습니다.');
      }
    } catch (err) {
      showToast(`OneDrive 오류: ${err.message}`);
    }
  });

  document.getElementById('btn-copy-gdrive-script')?.addEventListener('click', async () => {
    const scriptCode = [
      'function doGet(e) { return handle(e); }',
      'function doPost(e) { return handle(e); }',
      'function handle(e) {',
      '  var folderName = "VaultNote_Sync";',
      '  var fileName = "vaultnote-sync.vnvault.json";',
      '  var folders = DriveApp.getFoldersByName(folderName);',
      '  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);',
      '  var files = folder.getFilesByName(fileName);',
      '  var file = files.hasNext() ? files.next() : null;',
      '  if (e && e.postData && e.postData.contents) {',
      '    if (file) file.setContent(e.postData.contents);',
      '    else folder.createFile(fileName, e.postData.contents, MimeType.PLAIN_TEXT);',
      '    return ContentService.createTextOutput(JSON.stringify({ ok: true, updatedAt: Date.now() })).setMimeType(ContentService.MimeType.JSON);',
      '  }',
      '  if (!file) return ContentService.createTextOutput(JSON.stringify({ ok: true, empty: true })).setMimeType(ContentService.MimeType.JSON);',
      '  return ContentService.createTextOutput(file.getBlob().getDataAsString("UTF-8")).setMimeType(ContentService.MimeType.JSON);',
      '}'
    ].join('\n');
    try {
      await navigator.clipboard.writeText(scriptCode);
      showToast('구글 드라이브 자동화 코드가 클립보드에 복사되었습니다!');
    } catch {
      showToast('복사 실패');
    }
  });

  const handleSmartSyncGDrive = async () => {
    const token = document.getElementById('gdrive-token-input').value.trim();
    if (!token) return showToast('Google Drive 연결 주소(URL) 또는 토큰을 입력하세요.');
    state.settings.gdriveToken = token;
    showToast('Google Drive 상태 확인 중...');
    try {
      const remote = await VaultStorage.syncGoogleDriveAPI(token, state, 'load');
      const remoteHasNotes = remote && Array.isArray(remote.notes) && remote.notes.length > 0;
      if (remoteHasNotes && (isLocalDeviceFreshOrEmpty() || (remote.notes.length > state.notes.length))) {
        // Safe Pull: New device or device with fewer notes will fetch remote cloud data
        remote.settings = { ...(remote.settings || {}), gdriveToken: token };
        await applyRemoteSyncedState(remote, 'Google Drive에서 불러옴');
        showToast(`기존 Google Drive의 ${remote.notes.length}개 노트를 안전하게 불러왔습니다!`);
      } else {
        // Initial setup on device with existing notes
        state.lastSavedAt = Date.now();
        await VaultStorage.saveState(state);
        await VaultStorage.syncGoogleDriveAPI(token, state, 'save');
        showToast('Google Drive에 동기화 저장 및 자동 동기화 연결 완료');
      }
      refreshOneDriveSyncBadge();
    } catch (err) {
      showToast(`Google Drive 오류: ${err.message}`);
    }
  };

  document.getElementById('btn-gdrive-smart-sync')?.addEventListener('click', handleSmartSyncGDrive);

  document.getElementById('btn-gdrive-push').addEventListener('click', async () => {
    const token = document.getElementById('gdrive-token-input').value.trim();
    if (!token) return showToast('Google Drive 연결 주소(URL) 또는 토큰을 입력하세요.');
    state.settings.gdriveToken = token;
    state.lastSavedAt = Date.now();
    await VaultStorage.saveState(state);
    refreshOneDriveSyncBadge();
    try {
      await VaultStorage.syncGoogleDriveAPI(token, state, 'save');
      showToast('현재 기기의 노트를 Google Drive로 내보냈습니다.');
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById('btn-gdrive-pull').addEventListener('click', async () => {
    const token = document.getElementById('gdrive-token-input').value.trim();
    if (!token) return showToast('Google Drive 연결 주소(URL) 또는 토큰을 입력하세요.');
    state.settings.gdriveToken = token;
    await VaultStorage.saveState(state);
    refreshOneDriveSyncBadge();
    try {
      const remote = await VaultStorage.syncGoogleDriveAPI(token, state, 'load');
      if (remote && Array.isArray(remote.notes) && remote.notes.length > 0) {
        remote.settings = { ...(remote.settings || {}), gdriveToken: token };
        await applyRemoteSyncedState(remote, 'Google Drive에서 불러옴');
        showToast(`Google Drive에서 기존 ${remote.notes.length}개의 노트를 안전하게 불러왔습니다!`);
      } else {
        showToast('Google Drive에 저장된 노트 파일이 없습니다.');
      }
    } catch (err) {
      showToast(err.message);
    }
  });

  document.getElementById('btn-export-vault-file').addEventListener('click', exportVaultJsonFile);
  document.getElementById('import-vault-file-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (imported && Array.isArray(imported.notes)) {
        if (imported._images) {
          for (const [id, url] of Object.entries(imported._images)) {
            await VaultStorage.saveImage(id, url);
          }
        }
        state = imported;
        activeNoteId = state.notes[0]?.id || null;
        await VaultStorage.saveState(state);
        renderAll();
        document.getElementById('cloud-sync-modal').classList.add('hidden');
        showToast('성공적으로 복원되었습니다.');
      }
    } catch (err) {
      showToast(`파일 오류: ${err.message}`);
    }
  });

  // Security Modal
  const refreshGeminiKeyModalUI = () => {
    const inp = document.getElementById('gemini-api-key-input');
    const badge = document.getElementById('gemini-key-status-badge');
    const feedback = document.getElementById('gemini-key-test-feedback');
    const key = (state.settings.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
    if (inp) inp.value = key;
    if (badge) {
      badge.textContent = key ? `✓ API 키 등록됨 (${key.slice(0, 6)}...${key.slice(-4)})` : '미등록';
      badge.style.background = key ? 'var(--primary-color, #10b981)' : '';
      badge.style.color = key ? '#ffffff' : '';
    }
    if (feedback) {
      feedback.textContent = key ? '💡 [테스트] 버튼을 눌러 Google Gemini 서버와의 실시간 통신 상태를 확인할 수 있습니다.' : '';
      feedback.style.color = 'var(--text-muted)';
    }
  };

  document.getElementById('btn-security-modal').addEventListener('click', () => {
    refreshGeminiKeyModalUI();
    document.getElementById('security-modal').classList.remove('hidden');
  });
  document.getElementById('btn-close-security-modal').addEventListener('click', () => {
    document.getElementById('security-modal').classList.add('hidden');
  });
  document.getElementById('btn-lock-now').addEventListener('click', () =>
    lockEverything('화면이 잠금 상태로 전환되었습니다.', true)
  );

  document.getElementById('btn-save-app-lock').addEventListener('click', async () => {
    const pass = document.getElementById('set-app-lock-pass').value;
    if (!pass) return;
    state.settings.appLockVerifier = await VaultCrypto.createVerifier(pass);
    document.getElementById('set-app-lock-pass').value = '';
    scheduleSave();
    showToast('앱 진입 잠금이 설정되었습니다.');
  });

  document.getElementById('btn-Remove-app-lock').addEventListener('click', () => {
    state.settings.appLockVerifier = null;
    scheduleSave();
    showToast('앱 진입 잠금이 해제되었습니다.');
  });

  document.getElementById('auto-lock-minutes').addEventListener('change', (e) => {
    state.settings.autoLockMinutes = Number(e.target.value);
    scheduleSave();
    resetIdleTimer();
  });

  document.getElementById('btn-save-vault-master').addEventListener('click', async () => {
    const pass = document.getElementById('set-vault-master-pass').value;
    if (!pass) return;
    state.settings.vaultMasterVerifier = await VaultCrypto.createVerifier(pass);
    unlockedVaultPassword = pass;
    document.getElementById('set-vault-master-pass').value = '';
    scheduleSave();
    showToast('마스터 비밀번호가 설정되었습니다.');
  });

  document.getElementById('btn-toggle-gemini-key-vis')?.addEventListener('click', (e) => {
    const inp = document.getElementById('gemini-api-key-input');
    if (!inp) return;
    const isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    e.currentTarget.textContent = isHidden ? '숨김' : '보기';
  });

  document.getElementById('btn-test-gemini-key')?.addEventListener('click', async () => {
    const inp = document.getElementById('gemini-api-key-input');
    const feedback = document.getElementById('gemini-key-test-feedback');
    const key = (inp?.value || '').trim().replace(/^["']|["']$/g, '');
    if (!key) {
      if (feedback) {
        feedback.textContent = '❌ API 키를 먼저 입력해주세요.';
        feedback.style.color = 'var(--text-danger, #e53e3e)';
      }
      return showToast('Gemini API 키를 먼저 입력해주세요.');
    }

    if (feedback) {
      feedback.textContent = '⏳ Google Gemini 2.0 Flash 통신 확인 중...';
      feedback.style.color = 'var(--text-muted)';
    }

    const testRes = await testGeminiApiKey(key);
    if (feedback) {
      feedback.textContent = (testRes.ok ? '✅ ' : '❌ ') + testRes.message;
      feedback.style.color = testRes.ok ? 'var(--primary-color, #10b981)' : 'var(--text-danger, #e53e3e)';
    }
    showToast(testRes.message, testRes.ok ? 3000 : 4500);
  });

  document.getElementById('btn-save-gemini-key')?.addEventListener('click', () => {
    const key = (document.getElementById('gemini-api-key-input')?.value || '').trim().replace(/^["']|["']$/g, '');
    state.settings.geminiApiKey = key;
    refreshGeminiKeyModalUI();
    scheduleSave();
    if (key) {
      showToast('Google Gemini API 키가 저장되었습니다. [테스트] 버튼을 눌러 연결을 확인해보세요.');
    } else {
      showToast('Google Gemini API 키가 해제되었습니다.');
    }
  });

  document.getElementById('btn-close-summarize-modal')?.addEventListener('click', () => {
    document.getElementById('summarize-confirm-modal')?.classList.add('hidden');
  });
  document.getElementById('btn-confirm-offline-summarize')?.addEventListener('click', () => {
    document.getElementById('summarize-confirm-modal')?.classList.add('hidden');
    runOfflineSummarizeOnActiveNote('오프라인 자체 요약 완료 (외부 전송 없음)');
  });
  document.getElementById('btn-confirm-ai-summarize')?.addEventListener('click', async () => {
    await runAISummarizeOnActiveNote();
  });
  document.getElementById('btn-modal-test-gemini-key')?.addEventListener('click', async () => {
    const inp = document.getElementById('modal-gemini-key-input');
    const feedback = document.getElementById('modal-gemini-key-feedback');
    const key = (inp?.value || state.settings.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
    if (!key) {
      if (feedback) {
        feedback.textContent = '❌ 먼저 API 키를 입력해주세요.';
        feedback.style.color = 'var(--text-danger, #e53e3e)';
      }
      return showToast('Gemini API 키를 먼저 입력해주세요.');
    }
    if (feedback) {
      feedback.textContent = '⏳ Google Gemini 2.0 Flash 통신 확인 중...';
      feedback.style.color = 'var(--text-muted)';
    }
    const testRes = await testGeminiApiKey(key);
    if (feedback) {
      feedback.textContent = (testRes.ok ? '✅ ' : '❌ ') + testRes.message;
      feedback.style.color = testRes.ok ? 'var(--primary-color, #10b981)' : 'var(--text-danger, #e53e3e)';
    }
    showToast(testRes.message, testRes.ok ? 3000 : 4500);
  });

  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    const current = localStorage.getItem('vaultnote_theme') || state.settings?.theme || 'dark';
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('vaultnote_theme', nextTheme); } catch (_) {}
    state.settings.theme = nextTheme;
    document.documentElement.setAttribute('data-theme', nextTheme);
    scheduleSave(false);
    renderAll();
  });
}

function updateSidebarUI(collapsed) {
  const isMobile = window.innerWidth <= 820;
  if (isMobile) {
    try { sessionStorage.setItem('vaultnote_sidebar_mobile', collapsed ? '1' : '0'); } catch (_) {}
  } else {
    try { localStorage.setItem('vaultnote_sidebar_pc', collapsed ? '1' : '0'); } catch (_) {}
  }
  state.settings.sidebarCollapsed = collapsed;
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.toggle('collapsed', collapsed);
  if (backdrop) {
    backdrop.classList.toggle('hidden', collapsed || !isMobile);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isCurrentlyCollapsed = sidebar ? sidebar.classList.contains('collapsed') : isSidebarCollapsedOnDevice();
  updateSidebarUI(!isCurrentlyCollapsed);
}

function closeSidebar() {
  updateSidebarUI(true);
}

function createNewNote() {
  const now = new Date().toISOString();
  const defaultFolderId = activeNav.startsWith('folder:')
    ? activeNav.slice(7)
    : state.folders[0]?.id || 'f_work';

  const newNote = {
    id: uid('note'),
    title: '',
    folderId: defaultFolderId,
    docType: 'note',
    status: '',
    priority: 'normal',
    favorite: activeNav === 'favorites',
    trashed: false,
    isEncrypted: false,
    tags: activeNav.startsWith('tag:') ? [activeNav.slice(4)] : [],
    createdAt: now,
    updatedAt: now,
    blocks: [{ id: uid('b'), type: 'p', text: '' }]
  };

  state.notes.unshift(newNote);
  lastLocalMutationTime = Date.now();
  state.orderUpdatedAt = now;
  activeNoteId = newNote.id;
  if (['vault', 'graph', 'clipper', 'trash'].includes(activeNav)) activeNav = 'all';
  activeViewMode = 'editor';
  scheduleSave();
  renderAll();

  // 모바일 환경에서 새 노트 생성 시 사이드바 자동 닫기
  if (window.innerWidth <= 820) {
    updateSidebarUI(true);
  }

  setTimeout(() => {
    document.getElementById('note-title-input')?.focus();
  }, 20);
}

/**
 * 1. 이미지 파일 고효율 압축 및 해상도 최적화 (Canvas WebP / JPEG 0.85)
 */
async function optimizeImageFile(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
  if (!file) return null;
  // SVG나 150KB 이하의 작은 GIF 등은 원본 보존
  if (file.type === 'image/svg+xml') {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        if (width / maxWidth > height / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let dataUrl = canvas.toDataURL('image/webp', quality);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    };
    img.src = url;
  });
}

/**
 * 1-1. 웹 URL 이미지를 Base64 Data URL로 변환 (CORS 우회 프록시 지원)
 */
async function convertImageUrlToBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  // 1. Direct fetch attempt with CORS
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const b64 = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => resolve(null);
        r.readAsDataURL(blob);
      });
      if (b64 && b64.startsWith('data:image')) return b64;
    }
  } catch (_) {
    // CORS restricted, fallback to proxy
  }

  // 2. High-speed CORS proxy fallback (weserv.nl, strips CORS restrictions and converts to webp)
  try {
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=webp&q=85`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      const b64 = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => resolve(null);
        r.readAsDataURL(blob);
      });
      if (b64 && b64.startsWith('data:image')) return b64;
    }
  } catch (err) {
    console.warn('[VaultNote OCR] proxy fetch error:', err);
  }

  // 3. Fallback Image element with crossOrigin
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          let resUrl = canvas.toDataURL('image/webp', 0.85);
          if (!resUrl.startsWith('data:image/webp')) {
            resUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
          resolve(resUrl);
        } catch (_) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch (_) {
    return null;
  }
}

/**
 * 2. Google Gemini Vision API를 이용한 이미지 텍스트 인식 (OCR)
 */
async function recognizeTextFromImageWithGemini(dataUrlOrHttpUrl) {
  const apiKey = (state.settings.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey || !navigator.onLine) return null;

  let dataUrl = dataUrlOrHttpUrl;
  if (dataUrl && (dataUrl.startsWith('http://') || dataUrl.startsWith('https://'))) {
    dataUrl = await convertImageUrlToBase64(dataUrl);
  }

  const match = (dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64Data = match[2];

  const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
  const prompt = '이 이미지에 포함된 모든 글자(텍스트, 한국어, 영어, 숫자, 기호 등)를 누락 없이 정확하게 추출(OCR)해 주세요. 다른 설명이나 사족 없이 오직 이미지에서 읽어낸 글자 내용만 그대로 출력하세요.';

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                },
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048
          }
        })
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (text) return text;
    } catch (err) {
      console.warn('Gemini OCR retry model error:', err);
    }
  }
  return null;
}

/**
 * 3. 백그라운드 비동기 OCR 실행기 (화면 멈춤 없이 조용히 동작)
 */
async function runBackgroundOcrForBlock(note, imgBlock) {
  const apiKey = (state.settings.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) {
    showToast('Gemini API 키를 먼저 설정(우측 상단 ⚙)에 등록해 주세요.', 3000);
    return null;
  }
  if (!navigator.onLine) {
    showToast('오프라인 상태입니다. 인터넷 연결 후 다시 시도해 주세요.', 2500);
    return null;
  }

  try {
    let sourceUrl = imgBlock.dataUrl;
    if (!sourceUrl && imgBlock.imageId) {
      try {
        sourceUrl = await VaultStorage.getImage(imgBlock.imageId);
      } catch (_) {}
    }

    const text = await recognizeTextFromImageWithGemini(sourceUrl);
    if (text) {
      imgBlock.ocrText = text;
      touchNote(note);
      scheduleSave(false);

      // 현재 화면에 이 이미지 블록이 표시되고 있다면 복사 버튼 즉시 갱신
      const imgRow = document.querySelector(`.block-row[data-block-id="${imgBlock.id}"]`);
      if (imgRow) {
        const toolbar = imgRow.querySelector('.img-quick-toolbar');
        if (toolbar) {
          let ocrBtn = toolbar.querySelector('[data-imgocr]');
          if (ocrBtn) {
            ocrBtn.textContent = '📋 글자 복사';
            ocrBtn.title = '인식된 글자 클립보드 복사';
            ocrBtn.dataset.imgocr = 'copy';
            ocrBtn.disabled = false;
          }
        }
      }
      showToast('이미지 글자인식(OCR) 완료! 검색에 자동 반영됩니다.', 2500);
      return text;
    }
  } catch (err) {
    console.warn('[VaultNote OCR] 글자인식 오류:', err);
  }
  return null;
}

async function insertImageFileIntoNote(file) {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  const focusedRow = document.activeElement?.closest?.('.block-row');
  const focusedBlockId = focusedRow?.dataset?.blockId || null;

  showToast('이미지 고효율 압축 최적화 중...', 1200);
  const optimizedDataUrl = await optimizeImageFile(file, 1600, 1600, 0.85);

  const imageId = 'img_' + Math.random().toString(36).slice(2, 10);
  // 별도 이미지 저장소(IMAGE_STORE)에 저장
  VaultStorage.saveImage(imageId, optimizedDataUrl);

  const imgBlock = {
    id: uid('b'),
    type: 'image',
    imageId,
    dataUrl: optimizedDataUrl,
    width: '75%',
    text: '',
    ocrText: ''
  };

  const focusedIdx = focusedBlockId ? blocks.findIndex((b) => b.id === focusedBlockId) : -1;
  if (focusedIdx !== -1) {
    if (blocks[focusedIdx].type === 'p' && !(blocks[focusedIdx].text || '').trim()) {
      const nextP = { id: uid('b'), type: 'p', text: '' };
      blocks.splice(focusedIdx, 1, imgBlock, nextP);
    } else {
      blocks.splice(focusedIdx + 1, 0, imgBlock);
    }
  } else {
    blocks.push(imgBlock);
    blocks.push({ id: uid('b'), type: 'p', text: '' });
  }

  touchNote(note, blocks);
  renderActiveNoteEditor();
  showToast('이미지가 최적화되어 삽입되었습니다. (용량 90% 이상 절감)', 2500);

  // 백그라운드 비동기 글자 인식 실행 (화면 멈춤 없이 조용히 동작)
  runBackgroundOcrForBlock(note, imgBlock);
}

/**
 * OneNote-style automatic source link attribution when pasting copied web content into a note.
 */
function appendOneNoteSourceLinkToActiveNote(sourceUrl, afterBlockId = null) {
  if (!sourceUrl) return;
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  // Avoid duplicate consecutive source link for the same URL
  const alreadyHasSameSource = blocks.some(
    (b) => (b.text || '').includes(sourceUrl)
  );
  if (alreadyHasSameSource) return;

  const sourceBlock = {
    id: uid('b'),
    type: 'callout',
    text: `출처: ${sourceUrl}`
  };

  const targetIdx = afterBlockId ? blocks.findIndex((b) => b.id === afterBlockId) : -1;
  if (targetIdx !== -1) {
    blocks.splice(targetIdx + 1, 0, sourceBlock);
  } else {
    blocks.push(sourceBlock);
  }

  touchNote(note, blocks);
  renderActiveNoteEditor();
  showToast('웹페이지 원문 출처 링크가 자동으로 함께 표시되었습니다.');
}

/**
 * Applies a computed summary result (from Offline 4-Rule Engine or Google Gemini AI)
 * to the currently active note.
 */
function applySummaryResultToActiveNote(sumResult, toastMessage) {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks || !sumResult) return;

  blocks.splice(0, blocks.length, ...sumResult.blocks);
  if (!note.isEncrypted) {
    note.blocks = blocks;
  }

  note.tags = note.tags || [];
  if (!note.tags.includes('요약')) note.tags.push('요약');
  for (const kw of (sumResult.autoTags || []).filter(isMeaningfulTopicTag).slice(0, 2)) {
    if (!note.tags.includes(kw)) note.tags.push(kw);
  }

  touchNote(note, blocks);
  renderAll();
  document.getElementById('primary-editor-pane')?.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(toastMessage || `상단에 핵심 요약 ${sumResult.summaryCount}줄이 정리되었습니다.`, 3200);
}

function runOfflineSummarizeOnActiveNote(customPrefix = '') {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  const cleanBlocks = stripExistingSummaryBlocks(blocks);
  const sourceBlock = cleanBlocks.find((b) => b.type === 'callout' && (b.text || '').startsWith('출처:'));
  const sourceUrl = sourceBlock ? sourceBlock.text.replace(/^출처:\s*/, '').trim() : '';

  const sumResult = summarizeExtractedArticle(note.title || '', cleanBlocks, sourceUrl);
  if (sumResult.summaryCount === 0) {
    showToast('요약할 문장이 부족합니다. 내용을 조금 더 작성해주세요.');
    return;
  }

  const msg = customPrefix
    ? `${customPrefix}: 핵심 요약 ${sumResult.summaryCount}줄이 상단에 정리되었습니다.`
    : `상단에 핵심 요약 ${sumResult.summaryCount}줄이 정리되었습니다.`;
  applySummaryResultToActiveNote(sumResult, msg);
}

async function runAISummarizeOnActiveNote() {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  // Double-check security restriction: NEVER allow public AI on security folder or encrypted notes
  if (isNoteRestrictedFromPublicAI(note)) {
    document.getElementById('summarize-confirm-modal')?.classList.add('hidden');
    runOfflineSummarizeOnActiveNote('보안 노트는 외부 전송 없이 기기 내부에서만 요약됨');
    return;
  }

  // Check if user entered an API key inside the confirmation modal
  const modalKeyInput = document.getElementById('modal-gemini-key-input');
  if (modalKeyInput && modalKeyInput.value.trim()) {
    state.settings.geminiApiKey = modalKeyInput.value.trim();
    const secKeyInput = document.getElementById('gemini-api-key-input');
    if (secKeyInput) secKeyInput.value = state.settings.geminiApiKey;
    scheduleSave();
  }

  if (!(state.settings.geminiApiKey || '').trim()) {
    const keyBox = document.getElementById('modal-gemini-key-box');
    if (keyBox) {
      keyBox.classList.remove('hidden');
      modalKeyInput?.focus();
    }
    showToast('AI 고품질 요약을 사용하려면 무료 Gemini API 키를 입력하거나, 아래 [오프라인 자체 요약]을 눌러주세요.', 3600);
    return;
  }

  document.getElementById('summarize-confirm-modal')?.classList.add('hidden');
  showToast('민감정보를 제외하고 AI 핵심 요약을 생성하는 중...');

  const cleanBlocks = stripExistingSummaryBlocks(blocks);
  const sourceBlock = cleanBlocks.find((b) => b.type === 'callout' && (b.text || '').startsWith('출처:'));
  const sourceUrl = sourceBlock ? sourceBlock.text.replace(/^출처:\s*/, '').trim() : '';

  // Check if this note contains a YouTube video block or YouTube source URL
  const ytBlock = cleanBlocks.find((b) => b.type === 'youtube');
  const ytVideoId = ytBlock?.videoId || extractYouTubeVideoId(sourceUrl);
  if (ytVideoId) {
    document.getElementById('summarize-confirm-modal')?.classList.add('hidden');
    showToast('🎬 Gemini AI가 유튜브 영상을 심층 분석하는 중입니다 (약 15~25초)...');
    try {
      const apiKey = (state.settings.geminiApiKey || '').trim().replace(/^["']|["']$/g, '');
      const aiResult = await summarizeYouTubeWithGeminiAI(ytVideoId, note.title || '', apiKey);
      const newBlocks = convertYouTubeAiSummaryToBlocks(aiResult, sourceUrl, ytVideoId, note.title, ytBlock?.channelTitle);
      note.blocks = newBlocks;
      if (aiResult.title && (!note.title || note.title.startsWith('YouTube 동영상'))) {
        note.title = aiResult.title;
      }
      for (const t of (aiResult.tags || [])) {
        const cleanTag = String(t).replace(/^#/, '').trim();
        if (cleanTag && !note.tags.includes(cleanTag) && isMeaningfulTopicTag(cleanTag)) {
          note.tags.push(cleanTag);
        }
      }
      note.updatedAt = new Date().toISOString();
      scheduleSave();
      renderActiveNoteEditor();
      showToast(`✨ 유튜브 영상 심층 요약이 완료되었습니다: ${(note.title || '').slice(0, 24)}`);
      return;
    } catch (err) {
      console.warn('[Gemini YouTube Summarize Error]:', err);
      let reason = 'AI 통신 실패';
      const msg = String(err?.message || '');
      if (msg.includes('NO_API_KEY')) reason = 'Gemini API 키가 설정되지 않음';
      else if (msg.includes('TIMEOUT')) reason = 'AI 서버 응답 시간 초과 (영상 길이 확인)';
      else if (msg.includes('QUOTA') || msg.includes('429')) reason = 'API 할당량 초과';
      else if (msg.includes('API_KEY_INVALID') || msg.includes('400') || msg.includes('403')) reason = 'API 키 불일치';
      showToast(`유튜브 AI 분석 실패 (${reason})`, 4200);
      return;
    }
  }

  try {
    const aiResult = await summarizeWithGeminiAI(note.title || '', cleanBlocks, sourceUrl, true);
    const maskNotice = aiResult.totalMasked > 0 ? ` (민감정보 ${aiResult.totalMasked}건 자동 보호됨)` : '';
    applySummaryResultToActiveNote(
      aiResult,
      `AI 고품질 핵심 요약이 상단에 정리되었습니다.${maskNotice}`
    );
  } catch (err) {
    console.warn('[Gemini AI Summarize Error]:', err);
    let reason = 'AI 통신 실패';
    const msg = String(err?.message || '');
    if (msg.includes('NO_API_KEY')) {
      reason = 'Gemini API 키가 설정되지 않음';
    } else if (msg.includes('TOO_SHORT')) {
      reason = '요약할 본문 텍스트 부족';
    } else if (msg.includes('API_KEY_INVALID') || msg.includes('400') || msg.includes('403')) {
      reason = 'API 키 불일치 (키 확인 필요)';
    } else if (msg.includes('QUOTA_EXCEEDED') || msg.includes('429')) {
      reason = 'API 일일/분당 할당량 초과';
    } else if (msg.includes('TIMEOUT')) {
      reason = 'AI 서버 응답 시간 초과';
    } else if (msg.includes('SAFETY_BLOCKED')) {
      reason = '콘텐츠 안전 정책 감지';
    }
    showToast(`${reason} -> 기기 내부 [오프라인 자체 요약]으로 자동 전환되었습니다.`, 4200);
    runOfflineSummarizeOnActiveNote('오프라인 자체 요약 완료');
  }
}

/**
 * Summarize the currently active note according to the 3-tier security policy:
 * 1) Security Folder / Encrypted Note -> Immediately run 100% On-Device Offline Summarizer (Public AI completely excluded)
 * 2) User-Written Normal Note -> Show Confirmation Modal with sensitive-data masking notice & Offline/AI choice
 */
function summarizeCurrentActiveNote() {
  const note = getActiveNote();
  const blocks = getEditableBlocksForNote(note);
  if (!note || !blocks) return;

  const cleanBlocks = stripExistingSummaryBlocks(blocks);
  const totalTextLen = cleanBlocks
    .filter((b) => !(b.type === 'callout' && (b.text || '').startsWith('출처:')))
    .reduce((acc, b) => acc + ((b.text || '').trim().length + (b.details || '').trim().length), 0);

  if (totalTextLen < 10) {
    showToast('요약할 본문 내용을 먼저 작성해주세요.');
    return;
  }

  // Tier 3: Security Folder or Encrypted Note -> Completely exclude public AI from the start!
  if (isNoteRestrictedFromPublicAI(note)) {
    runOfflineSummarizeOnActiveNote('보안 폴더/암호화 노트 보호 (외부 전송 없음)');
    return;
  }

  // Tier 2: Normal User Note -> Show Confirmation Modal before any external AI transmission
  const { totalMasked } = prepareSafeNotePayloadForAI(note.title || '', cleanBlocks);
  const maskedInfoEl = document.getElementById('summarize-masked-info');
  if (maskedInfoEl) {
    maskedInfoEl.textContent =
      totalMasked > 0
        ? `감지된 민감정보 ${totalMasked}건(전화번호·이메일·계좌·비밀번호·시크릿 블록 등)이 전송 전 기기에서 [비공개_정보]로 자동 마스킹됩니다.`
        : '감지된 민감정보 패턴(전화번호·계좌·비밀번호 등)이 없으며, 안심하고 요약할 수 있습니다.';
  }

  const curKey = (state.settings.geminiApiKey || '').trim();
  const hasKey = Boolean(curKey);
  const keyBox = document.getElementById('modal-gemini-key-box');
  const modalKeyInp = document.getElementById('modal-gemini-key-input');
  if (modalKeyInp && curKey) modalKeyInp.value = curKey;
  const modalFeedback = document.getElementById('modal-gemini-key-feedback');
  if (modalFeedback) modalFeedback.textContent = '';
  if (keyBox) {
    keyBox.classList.toggle('hidden', hasKey);
  }

  document.getElementById('summarize-confirm-modal')?.classList.remove('hidden');
}

function openSearchModal() {
  const modal = document.getElementById('search-modal');
  modal.classList.remove('hidden');
  const inp = document.getElementById('global-search-input');
  inp.value = '';
  document.getElementById('btn-clear-global-search')?.classList.add('hidden');
  renderGlobalSearchResults();
  setTimeout(() => inp.focus(), 10);
}

function renderGlobalSearchResults() {
  const q = document.getElementById('global-search-input').value.trim().toLowerCase();
  const listEl = document.getElementById('search-results-list');
  listEl.innerHTML = '';

  const matches = state.notes
    .filter((n) => !n.trashed)
    .filter((n) => {
      if (!q) return true;
      const inTitle = (n.title || '').toLowerCase().includes(q);
      const inTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
      const inBody = !n.isEncrypted && (n.blocks || []).some((b) => {
        const textMatch = (b.text || '').toLowerCase().includes(q) || (b.details || '').toLowerCase().includes(q);
        const ocrMatch = b.type === 'image' && (b.ocrText || '').toLowerCase().includes(q);
        return textMatch || ocrMatch;
      });
      return inTitle || inTags || inBody;
    })
    .slice(0, 12);

  for (const n of matches) {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.innerHTML = `
      <div style="font-weight:600;">${highlightSearchTerm(n.title || '제목 없음', q)}</div>
      <div class="text-muted">${highlightSearchTerm(getNotePlainSnippet(n, q), q)}</div>
    `;
    div.addEventListener('click', () => {
      document.getElementById('search-modal').classList.add('hidden');
      pendingEditorSearchHighlight = q;
      openNoteInEditor(n.id);
    });
    listEl.appendChild(div);
  }
}

async function exportVaultJsonFile() {
  const images = await VaultStorage.getAllImages();
  const exportPayload = {
    ...state,
    _images: images
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vaultnote-sync.vnvault.json';
  a.click();
}

initApp();
