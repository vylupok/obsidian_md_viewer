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

let vaultHandle = null;
let currentFileHandle = null;
let currentFileName = null;
let fileList = [];
let folderFiles = [];

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
  if (!window.showDirectoryPicker) {
    setStatus('Ваш браузер не підтримує вибір папки. Імпортуйте файли або папку вручну.');
    folderInput.click();
    return;
  }

  try {
    vaultHandle = await window.showDirectoryPicker();
    fileList = [];
    folderFiles = [];
    await walkDirectory(vaultHandle);
    if (!fileList.length) {
      setStatus('У папці не знайдено .md файлів.');
    } else {
      setStatus(`Відкрито сховище: ${vaultHandle.name}`);
    }
    renderFileList();
  } catch (error) {
    console.warn(error);
    setStatus('Відкриття сховища скасоване.');
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
  const imported = Array.from(files).filter((file) => file.name.toLowerCase().endsWith('.md'));
  if (!imported.length) {
    setStatus('Виберіть файли *.md.');
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
    setStatus('Файли вже імпортовані.');
    return;
  }

  renderFileList();
  if (!currentFileName) {
    const first = fileList.find((item) => item.file);
    if (first) openFile(first);
  }
  setStatus(`Імпортовано ${added} файл(ів)`);
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
  const title = `Нова нотатка`;
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
  setStatus('Створено нову нотатку');
}

async function saveCurrentNote() {
  const content = editor.value;
  const title = noteTitleInput.value.trim() || 'Нова нотатка';
  const filename = `${sanitizeFileName(title)}.md`;
  let targetHandle = currentFileHandle;
  let savedName = filename;

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
      setStatus(`Збережено: ${filename}`);
      return;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`Завантажено: ${filename}`);
  } catch (error) {
    console.error(error);
    setStatus('Не вдалося зберегти нотатку');
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

renderPreview('Ласкаво просимо! Виберіть файл або створіть нову нотатку.');
setStatus('Готово');
