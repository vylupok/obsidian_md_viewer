const fileInput = document.getElementById('file-input');
const folderInput = document.getElementById('folder-input');
const openVaultButton = document.getElementById('open-vault');
const importButton = document.getElementById('import-files');
const importFolderButton = document.getElementById('import-folder');
const newNoteButton = document.getElementById('new-note');
const saveNoteButton = document.getElementById('save-note');
const filesContainer = document.getElementById('files');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const noteTitleInput = document.getElementById('note-title');
const status = document.getElementById('status');
const appTitle = document.getElementById('app-title');
const appDesc = document.getElementById('app-desc');
const filesHeading = document.getElementById('files-heading');
const emptyState = document.getElementById('empty-state');
const nameLabel = document.getElementById('name-label');
const statusLabel = document.getElementById('status-label');
const editorHeading = document.getElementById('editor-heading');
const languageSelect = document.getElementById('language-select');
const togglePreviewInput = document.getElementById('toggle-preview');
const previewLabel = document.getElementById('preview-label');

let vaultHandle = null;
let currentFileHandle = null;
let currentFileName = null;
let fileList = [];
let folderFiles = [];
let currentLang = 'en';
let isLivePreview = false;


const i18n = {
  en: {
    title: 'Obsidian Markdown Viewer',
    description: 'Open a vault, view .md and create new notes in Markdown.',
    openVault: 'Open vault',
    importFiles: 'Import .md',
    importFolder: 'Import folder',
    newNote: 'New note',
    saveNote: 'Save note',
    enableLivePreview: 'Enable Live Preview',
    disableLivePreview: 'Disable Live Preview',
    files: 'Files',
    name: 'Title:',
    status: 'Status:',
    editor: 'Editor',
    preview: 'Live Preview',
    previewActive: 'Preview ON',
    editorPlaceholder: 'Type Markdown here...',
    emptyState: 'Open a folder or import files to start.',
    welcome: 'Welcome! Select a file or create a new note.',
    ready: 'Ready',
    unsupportedFolder: 'Your browser does not support directory picker. Import files/folder manually.',
    noMdInFolder: 'No .md files found in folder.',
    openedVault: 'Opened vault: ',
    saved: 'Saved: ',
    downloaded: 'Downloaded: ',
    newNoteCreated: 'New note created',
    alreadyImported: 'Files already imported.',
    selectMd: 'Select .md files.',
    vaultCancelled: 'Vault open cancelled.',
    errorOpen: 'Error opening file',
    errorSave: 'Could not save note',
    imported: 'Imported {n} file(s)'
  },
  uk: {
    title: 'Переглядач Obsidian Markdown',
    description: 'Відкривайте сховище, переглядайте .md та створюйте нотатки у Markdown.',
    openVault: 'Відкрити сховище',
    importFiles: 'Імпортувати .md',
    importFolder: 'Імпортувати папку',
    newNote: 'Нова нотатка',
    saveNote: 'Зберегти нотатку',
    enableLivePreview: 'Увімкнути Live Preview',
    disableLivePreview: 'Вимкнути Live Preview',
    files: 'Файли',
    name: 'Назва:',
    status: 'Статус:',
    editor: 'Редактор',
    preview: 'Попередній перегляд',
    previewActive: 'Перегляд ВКЛ',
    editorPlaceholder: 'Вставте Markdown тут...',
    emptyState: 'Відкрийте папку або імпортуйте файли, щоб почати.',
    welcome: 'Ласкаво просимо! Виберіть файл або створіть нову нотатку.',
    ready: 'Готово',
    unsupportedFolder: 'Ваш браузер не підтримує вибір папки. Імпортуйте файли/папку вручну.',
    noMdInFolder: 'У папці не знайдено .md файлів.',
    openedVault: 'Відкрито сховище: ',
    saved: 'Збережено: ',
    downloaded: 'Завантажено: ',
    newNoteCreated: 'Створено нову нотатку',
    alreadyImported: 'Файли вже імпортовані.',
    selectMd: 'Виберіть файли .md.',
    vaultCancelled: 'Відкриття сховища скасовано.',
    errorOpen: 'Помилка відкриття файлу',
    errorSave: 'Не вдалося зберегти нотатку',
    imported: 'Імпортовано {n} файл(ів)'
  }
};

function localize(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '');
}

function applyLanguage(lang) {
  currentLang = lang;
  const t = i18n[lang];
  document.title = t.title;
  appTitle.textContent = t.title;
  appDesc.textContent = t.description;
  openVaultButton.textContent = t.openVault;
  importButton.textContent = t.importFiles;
  importFolderButton.textContent = t.importFolder;
  newNoteButton.textContent = t.newNote;
  saveNoteButton.textContent = t.saveNote;
  filesHeading.textContent = t.files;
  nameLabel.textContent = t.name;
  statusLabel.textContent = t.status;
  editorHeading.textContent = t.editor;
  previewLabel.textContent = t.preview;
  editor.placeholder = t.editorPlaceholder;
  emptyState.textContent = t.emptyState;
  setStatus(t.ready);
}

languageSelect.addEventListener('change', () => applyLanguage(languageSelect.value));

togglePreviewInput.addEventListener('change', () => {
  setModePreview(togglePreviewInput.checked);
});

function setModePreview(previewMode) {
  isLivePreview = previewMode;
  if (isLivePreview) {
    editor.style.display = 'none';
    preview.style.display = 'block';
    previewHeading.style.display = 'block';
    previewLabel.textContent = i18n[currentLang].previewActive;
  } else {
    editor.style.display = 'block';
    preview.style.display = 'none';
    previewHeading.style.display = 'none';
    previewLabel.textContent = i18n[currentLang].preview;
    editor.focus();
  }
}


// if user starts typing in preview mode, switch back to editor mode
document.addEventListener('keydown', (event) => {
  if (!isLivePreview) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter' || event.key === 'Tab') {
    setModePreview(false);
  }
});

function setStatus(message) {
  status.textContent = message;
}

function sanitizeFileName(name) {
  return name.replace(/[\/\?%*:|"<>]/g, '-');
}

function renderFileList() {
  filesContainer.innerHTML = '';
  if (!fileList.length) {
    filesContainer.innerHTML = '<div class="empty-state">Відкрийте папку або імпортуйте файли, щоб почати.</div>';
    return;
  }
  fileList.sort((a, b) => a.name.localeCompare(b.name));
  fileList.forEach((file) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'file-item' + (file.name === currentFileName ? ' active' : '');
    item.textContent = file.name;
    item.addEventListener('click', () => openFile(file));
    filesContainer.appendChild(item);
  });
}

async function openFile(fileInfo) {
  try {
    let content = '';
    if (fileInfo.handle) {
      const file = await fileInfo.handle.getFile();
      content = await file.text();
      currentFileHandle = fileInfo.handle;
    } else if (fileInfo.file) {
      content = await fileInfo.file.text();
      currentFileHandle = null;
    }
    currentFileName = fileInfo.name;
    noteTitleInput.value = fileInfo.name.replace(/\.md$/i, '');
    editor.value = content;
    renderPreview(content);
    renderFileList();
    setStatus(`Відкрито: ${fileInfo.name}`);
  } catch (error) {
    console.error(error);
    setStatus('Помилка відкриття файлу');
  }
}

function renderPreview(markdown) {
  try {
    const html = marked.parse(markdown, { mangle: false, headerIds: false });
    preview.innerHTML = html;
  } catch (error) {
    preview.textContent = 'Помилка рендерингу Markdown.';
  }
}

async function openVault() {
  const t = i18n[currentLang];
  if (!window.showDirectoryPicker) {
    setStatus(t.unsupportedFolder);
    folderInput.click();
    return;
  }

  try {
    vaultHandle = await window.showDirectoryPicker();
    fileList = [];
    folderFiles = [];
    await walkDirectory(vaultHandle);
    if (!fileList.length) {
      setStatus(t.noMdInFolder);
    } else {
      setStatus(`${t.openedVault}${vaultHandle.name}`);
    }
    renderFileList();
  } catch (error) {
    console.warn(error);
    setStatus(t.vaultCancelled);
  }
}

async function walkDirectory(dirHandle, path = '') {
  for await (const [name, entry] of dirHandle.entries()) {
    if (entry.kind === 'file' && name.toLowerCase().endsWith('.md')) {
      const filePath = path ? `${path}/${name}` : name;
      const fileEntry = { name: filePath, handle: entry };
      fileList.push(fileEntry);
      folderFiles.push(fileEntry);
    } else if (entry.kind === 'directory') {
      await walkDirectory(entry, path ? `${path}/${name}` : name);
    }
  }
}

function importFiles(files) {
  const t = i18n[currentLang];
  const imported = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.md'));
  if (!imported.length) {
    setStatus(t.selectMd);
    return;
  }

  let added = 0;
  imported.forEach((file) => {
    const name = file.webkitRelativePath || file.name;
    if (!fileList.some((item) => item.name === name)) {
      fileList.push({ name, file });
      added += 1;
    }
  });

  if (!added) {
    setStatus(t.alreadyImported);
    return;
  }

  renderFileList();
  if (!currentFileName) {
    const first = fileList.find((item) => item.file);
    if (first) openFile(first);
  }
  setStatus(localize(t.imported, { n: added }));
}

function createFrontmatter(title) {
  const date = new Date().toISOString();
  return `---
title: ${title}
date: ${date}
---

`;
}

function createNewNote() {
  const t = i18n[currentLang];
  const title = currentLang === 'uk' ? 'Нова нотатка' : 'New note';
  const filename = `${sanitizeFileName(title)}.md`;
  const content = `${createFrontmatter(title)}# ${title}

`;
  currentFileName = filename;
  currentFileHandle = null;
  noteTitleInput.value = title;
  editor.value = content;
  renderPreview(content);
  fileList.unshift({ name: filename, file: null, handle: null, newNote: true });
  renderFileList();
  setStatus(t.newNoteCreated);
}

async function saveCurrentNote() {
  const content = editor.value;
  const title = noteTitleInput.value.trim() || 'Нова нотатка';
  const filename = `${sanitizeFileName(title)}.md`;
  let targetHandle = currentFileHandle;
  let savedName = filename;

  const t = i18n[currentLang];
  try {
    if (vaultHandle) {
      if (!targetHandle) {
        targetHandle = await vaultHandle.getFileHandle(filename, { create: true });
      }
      const writable = await targetHandle.createWritable();
      await writable.write(content);
      await writable.close();
      currentFileHandle = targetHandle;
      currentFileName = filename;
      const existing = fileList.find((item) => item.name === filename);
      if (!existing) {
        fileList.unshift({ name: filename, handle: targetHandle });
      }
      renderFileList();
      setStatus(`${t.saved}${filename}`);
      return;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`${t.downloaded}${filename}`);
  } catch (error) {
    console.error(error);
    setStatus(t.errorSave);
  }
}

editor.addEventListener('input', (event) => {
  renderPreview(event.target.value);
});

openVaultButton.addEventListener('click', openVault);
importButton.addEventListener('click', () => fileInput.click());
importFolderButton.addEventListener('click', () => folderInput.click());
fileInput.addEventListener('change', (event) => {
  importFiles(event.target.files);
  fileInput.value = '';
});
folderInput.addEventListener('change', (event) => {
  importFiles(event.target.files);
  folderInput.value = '';
});
filesContainer.addEventListener('dragover', (event) => {
  event.preventDefault();
  filesContainer.classList.add('drag-over');
});
filesContainer.addEventListener('dragleave', () => {
  filesContainer.classList.remove('drag-over');
});
filesContainer.addEventListener('drop', (event) => {
  event.preventDefault();
  filesContainer.classList.remove('drag-over');
  importFiles(event.dataTransfer.files);
});
newNoteButton.addEventListener('click', createNewNote);
saveNoteButton.addEventListener('click', saveCurrentNote);

applyLanguage('en');
setModePreview(false);
renderPreview(i18n[currentLang].welcome);
