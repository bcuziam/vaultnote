/**
 * VaultNote — Hybrid Local-First & Cloud Sync Storage Engine
 * Supports:
 * 1. IndexedDB Ultra-Fast Local Storage
 * 2. PC OneDrive / Google Drive Folder Direct Sync (Node local bridge + Browser File System Access API)
 * 3. Cloud API Direct Sync (Google Drive REST API v3 + Microsoft OneDrive Graph API) for Galaxy Z Fold 7 & External PCs
 * 4. Emergency Local Wipe for temporary use on public/other PCs
 */

const DB_NAME = 'VaultNoteDB_v1';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'vaultnote_root_state';
const DIR_HANDLE_KEY = 'vaultnote_onedrive_dir_handle';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let directoryHandle = null; // Browser File System Access API handle

export const VaultStorage = {
  async loadState() {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(STATE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB load fallback to localStorage:', err);
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  },

  async saveState(state) {
    const payload = {
      ...state,
      lastSavedAt: new Date().toISOString()
    };
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(payload, STATE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB save fallback to localStorage:', err);
      localStorage.setItem(STATE_KEY, JSON.stringify(payload));
    }
    return payload;
  },

  /**
   * Emergency Wipe for External / Public PCs
   */
  async wipeAllLocalData() {
    localStorage.clear();
    sessionStorage.clear();
    try {
      const db = await openDB();
      db.close();
    } catch {}
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  },

  /**
   * Convert notes to clean Markdown files for human-readable storage in OneDrive/Google Drive
   */
  notesToMarkdownFiles(notes, folders) {
    const folderMap = new Map((folders || []).map((f) => [f.id, f.name]));
    return (notes || [])
      .filter((n) => !n.trashed)
      .map((note) => {
        const folderName = folderMap.get(note.folderId) || '미분류';
        if (note.isEncrypted) {
          return {
            filename: `[암호화됨]_${note.title || '제목없음'}`,
            content: `---\ntitle: "${note.title}"\nencrypted: true\nupdatedAt: "${note.updatedAt}"\n---\n\n🔒 이 노트는 AES-256-GCM으로 암호화되어 있습니다. VaultNote에서 마스터 비밀번호로 열람하세요.\n`
          };
        }
        const lines = [
          `---`,
          `title: "${(note.title || '').replace(/"/g, '\\"')}"`,
          `folder: "${folderName}"`,
          `type: "${note.docType || 'note'}"`,
          `status: "${note.status || 'active'}"`,
          `priority: "${note.priority || 'normal'}"`,
          `tags: [${(note.tags || []).map((t) => `"${t}"`).join(', ')}]`,
          `updatedAt: "${note.updatedAt || ''}"`,
          `---`,
          ``,
          `# ${note.title || '제목 없음'}`,
          ``
        ];
        for (const b of note.blocks || []) {
          if (b.type === 'h1') lines.push(`# ${b.text || ''}`);
          else if (b.type === 'h2') lines.push(`## ${b.text || ''}`);
          else if (b.type === 'h3') lines.push(`### ${b.text || ''}`);
          else if (b.type === 'todo') lines.push(`- [${b.checked ? 'x' : ' '}] ${b.text || ''}`);
          else if (b.type === 'bullet') lines.push(`- ${b.text || ''}`);
          else if (b.type === 'number') lines.push(`1. ${b.text || ''}`);
          else if (b.type === 'quote' || b.type === 'callout') lines.push(`> ${b.text || ''}`);
          else if (b.type === 'code') lines.push(`\`\`\`${b.lang || ''}\n${b.text || ''}\n\`\`\``);
          else if (b.type === 'divider') lines.push(`---`);
          else if (b.type === 'secret') lines.push(`> 🔒 [암호화된 보안 블록]`);
          else lines.push(b.text || '');
          lines.push('');
        }
        return {
          filename: `${folderName}_${note.title || note.id}`,
          content: lines.join('\n')
        };
      });
  },

  /**
   * 1-A. Detect PC OneDrive / Google Drive folders via local server bridge
   */
  async detectPCCloudFolders() {
    try {
      const res = await fetch('/api/cloud-folders');
      if (!res.ok) return [];
      const data = await res.json();
      return data.ok ? data.folders : [];
    } catch {
      return [];
    }
  },

  /**
   * 1-B. Sync directly with PC OneDrive / Google Drive path via local bridge
   */
  async syncWithPCFolder(vaultDir, state, action = 'save') {
    const body = {
      action,
      vaultDir
    };
    if (action === 'save') {
      body.data = state;
      body.exportMarkdown = true;
      body.markdownFiles = this.notesToMarkdownFiles(state.notes, state.folders);
    }
    const res = await fetch('/api/cloud-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  },

  /**
   * 2. Browser File System Access API (Direct OneDrive Folder Picker for Chrome/Edge on PC, works on GitHub Pages too!)
   */
  async pickBrowserDirectory() {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('이 브라우저는 폴더 직접 연결 API를 지원하지 않습니다. OneDrive 자동 동기화 토큰 또는 파일 불러오기를 이용해주세요.');
    }
    directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    try {
      const db = await openDB();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(directoryHandle, DIR_HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {}
    return directoryHandle.name;
  },

  async restoreBrowserDirectoryHandle() {
    if (directoryHandle) return directoryHandle;
    try {
      const db = await openDB();
      const handle = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(DIR_HANDLE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (handle) {
        const perm = await handle.queryPermission?.({ mode: 'readwrite' });
        if (perm === 'granted') {
          directoryHandle = handle;
          return directoryHandle;
        }
      }
    } catch {}
    return null;
  },

  async saveToBrowserDirectory(state) {
    await this.restoreBrowserDirectoryHandle();
    if (!directoryHandle) throw new Error('연결된 폴더가 없습니다.');
    const payload = { ...state, lastSavedAt: state.lastSavedAt || new Date().toISOString() };
    const fileHandle = await directoryHandle.getFileHandle('vaultnote-sync.vnvault.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    return { ok: true, folderName: directoryHandle.name, updatedAt: payload.lastSavedAt };
  },

  async loadFromBrowserDirectory() {
    await this.restoreBrowserDirectoryHandle();
    if (!directoryHandle) throw new Error('연결된 폴더가 없습니다.');
    const fileHandle = await directoryHandle.getFileHandle('vaultnote-sync.vnvault.json', { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  },

  /**
   * 3. Microsoft OneDrive Graph API Direct Sync (Works on GitHub Pages, Smartphone Web App, and PC)
   */
  async syncOneDriveAPI(accessToken, state, action = 'save') {
    const cleanToken = String(accessToken || '').replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) throw new Error('OneDrive 토큰이 비어 있습니다.');
    const contentEndpoint = 'https://graph.microsoft.com/v1.0/me/drive/root:/VaultNote_Sync/vaultnote-sync.vnvault.json:/content';
    if (action === 'save') {
      const payload = { ...state, lastSavedAt: new Date().toISOString() };
      const res = await fetch(contentEndpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload, null, 2)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OneDrive 업로드 실패 (${res.status}): ${errText}`);
      }
      return await res.json();
    } else {
      const res = await fetch(contentEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cleanToken}`
        }
      });
      if (res.status === 404) {
        return null; // File not created on OneDrive yet
      }
      if (!res.ok) {
        throw new Error(`OneDrive 불러오기 실패 (${res.status})`);
      }
      return await res.json();
    }
  },

  /**
   * 4. Google Drive Direct Sync (Supports both Permanent Google Apps Script Web App URL & REST API v3 Token)
   *    - Works on PC & Smartphone without installing Google Drive Desktop!
   */
  async syncGoogleDriveAPI(tokenOrUrl, state, action = 'save') {
    const cleanInput = String(tokenOrUrl || '').trim();
    if (!cleanInput) throw new Error('Google Drive 연결 주소(URL) 또는 토큰을 입력해주세요.');

    // A. Permanent Google Apps Script Bridge URL (Never expires, no PC installation required!)
    if (/^https:\/\/script\.google\.com\/macros\/s\//i.test(cleanInput)) {
      if (action === 'save') {
        const payload = { ...state, lastSavedAt: new Date().toISOString() };
        const res = await fetch(cleanInput, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload, null, 2),
          redirect: 'follow'
        });
        if (!res.ok) {
          throw new Error(`구글 드라이브 자동 저장 실패 (${res.status})`);
        }
        return await res.json();
      } else {
        const sep = cleanInput.includes('?') ? '&' : '?';
        const res = await fetch(`${cleanInput}${sep}t=${Date.now()}`, {
          method: 'GET',
          redirect: 'follow'
        });
        if (!res.ok) {
          throw new Error(`구글 드라이브 자동 불러오기 실패 (${res.status})`);
        }
        const data = await res.json();
        if (data && data.empty) return null;
        return data;
      }
    }

    // B. Standard Google Drive REST API v3 OAuth Token
    const accessToken = cleanInput.replace(/^Bearer\s+/i, '');
    const fileName = 'vaultnote-sync.vnvault.json';
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${fileName}' and trashed=false`)}&fields=files(id,name,modifiedTime)`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!searchRes.ok) {
      throw new Error(`Google Drive 인증 또는 조회 실패 (${searchRes.status})`);
    }
    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files[0];

    if (action === 'load') {
      if (!existingFile) {
        return null;
      }
      const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!dlRes.ok) throw new Error(`Google Drive 다운로드 실패 (${dlRes.status})`);
      return await dlRes.json();
    } else {
      const payload = { ...state, lastSavedAt: new Date().toISOString() };
      const metadata = { name: fileName, mimeType: 'application/json' };
      const boundary = '-------VaultNoteBoundary' + Date.now();
      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${JSON.stringify(payload, null, 2)}\r\n` +
        `--${boundary}--`;

      const uploadUrl = existingFile
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

      const upRes = await fetch(uploadUrl, {
        method: existingFile ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });
      if (!upRes.ok) {
        const errText = await upRes.text();
        throw new Error(`Google Drive 저장 실패 (${upRes.status}): ${errText}`);
      }
      return await upRes.json();
    }
  }
};
