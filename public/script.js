// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const contentEditor = document.getElementById('content-editor');
const contentInput = document.getElementById('content-input');
const shareBtn = document.getElementById('share-btn');
const clearBtn = document.getElementById('clear-btn');
const codeInput = document.getElementById('code-input');
const retrieveBtn = document.getElementById('retrieve-btn');
const shareResult = document.getElementById('share-result');
const retrieveResult = document.getElementById('retrieve-result');
const generatedCode = document.getElementById('generated-code');
const copyCodeBtn = document.getElementById('copy-code-btn');
const statsDisplay = document.getElementById('stats-display');
const toastContainer = document.getElementById('toast-container');

// Upload Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const selectFileBtn = document.getElementById('select-file-btn');
const selectedFiles = document.getElementById('selected-files');
const filesList = document.getElementById('files-list');
const uploadShareBtn = document.getElementById('upload-share-btn');
const clearFilesBtn = document.getElementById('clear-files-btn');
const uploadProgress = document.getElementById('upload-progress');
const progressFill = document.getElementById('progress-fill');
const uploadStatus = document.getElementById('upload-status');
const uploadResult = document.getElementById('upload-result');
const uploadedCount = document.getElementById('uploaded-count');
const uploadedCode = document.getElementById('uploaded-code');
const copyUploadCodeBtn = document.getElementById('copy-upload-code-btn');

// Array für ausgewählte Dateien
let selectedFilesArray = [];

let expiryInterval = null;

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        
        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${targetTab}-tab`) {
                content.classList.add('active');
            }
        });
        
        // Clear results when switching tabs
        shareResult.style.display = 'none';
        retrieveResult.style.display = 'none';
    });
});

// Editor Toolbar
const toolbarBtns = document.querySelectorAll('.toolbar-btn');
toolbarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        executeEditorAction(action);
    });
});

function executeEditorAction(action) {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    switch(action) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'code':
            const codeElement = document.createElement('code');
            if (selection.toString()) {
                codeElement.textContent = selection.toString();
                range.deleteContents();
                range.insertNode(codeElement);
            }
            break;
        case 'clear':
            contentEditor.innerHTML = '';
            break;
    }
    
    contentEditor.focus();
}

// Auto-detect language from content
function detectLanguage(content) {
    const firstLine = content.trim().split('\n')[0].toLowerCase();
    
    // Common patterns for language detection
    if (firstLine.includes('<!doctype') || firstLine.includes('<html')) return 'html';
    if (firstLine.includes('<?php')) return 'php';
    if (firstLine.includes('#!/usr/bin/env python') || firstLine.includes('import ') || firstLine.includes('def ')) return 'python';
    if (firstLine.includes('function ') || firstLine.includes('const ') || firstLine.includes('let ') || firstLine.includes('var ')) return 'javascript';
    if (firstLine.includes('public class') || firstLine.includes('import java')) return 'java';
    if (firstLine.includes('#include') || firstLine.includes('using namespace')) return 'cpp';
    if (firstLine.includes('using System;') || firstLine.includes('namespace ')) return 'csharp';
    if (firstLine.includes('def ') && firstLine.includes('end')) return 'ruby';
    if (firstLine.includes('package ') && firstLine.includes('import ')) return 'go';
    if (firstLine.includes('fn ') || firstLine.includes('use ')) return 'rust';
    if (firstLine.includes('SELECT ') || firstLine.includes('CREATE TABLE')) return 'sql';
    if (firstLine.includes('{') && firstLine.includes('}')) return 'json';
    if (firstLine.includes('---') || firstLine.includes('yaml')) return 'yaml';
    if (firstLine.includes('#!/bin/bash') || firstLine.includes('#!/bin/sh')) return 'bash';
    if (firstLine.includes('#!/usr/bin/env powershell')) return 'powershell';
    
    return 'text';
}

// Share Content
shareBtn.addEventListener('click', async () => {
    let content = contentEditor.innerHTML; // Immer als HTML speichern
    
    if (!content.trim()) {
        showToast('Bitte geben Sie einen Inhalt ein', 'warning');
        return;
    }
    
    const expirySelect = document.getElementById('expiry-select');
    const expiryMinutes = parseInt(expirySelect.value, 10) || 5;
    
    shareBtn.disabled = true;
    shareBtn.innerHTML = '<span class="btn-icon">⏳</span> Wird geteilt...';
    
    try {
        const response = await fetch('/api/share', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content, expiryMinutes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            generatedCode.textContent = data.code;
            const baseUrl = window.location.protocol + '//' + window.location.host;
            const directLink = `${baseUrl}/?code=${data.code}`;
            document.getElementById('generated-link').innerHTML = `<a href='${directLink}' target='_blank'>${directLink}</a>`;
            // QR-Code als Bild anzeigen
            document.getElementById('qr-code-img').src = `/api/qr?text=${encodeURIComponent(directLink)}`;
            shareResult.style.display = 'block';
            showToast('Inhalt erfolgreich geteilt!', 'success');
            updateStats();
        } else {
            showToast(data.error || 'Fehler beim Teilen', 'error');
        }
    } catch (error) {
        console.error('Fehler beim Teilen:', error);
        showToast('Netzwerkfehler beim Teilen', 'error');
    } finally {
        shareBtn.disabled = false;
        shareBtn.innerHTML = '<span class="btn-icon">📤</span> Teilen';
    }
});

// Clear Content
clearBtn.addEventListener('click', () => {
    contentEditor.innerHTML = '';
    contentInput.value = '';
    shareResult.style.display = 'none';
    retrieveResult.style.display = 'none';
    contentTypeSelect.value = 'text';
    showToast('Inhalt gelöscht', 'success');
});

// Retrieve Content
retrieveBtn.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    
    if (!code || code.length !== 4) {
        showToast('Bitte geben Sie einen 4-stelligen Code ein', 'warning');
        return;
    }
    
    retrieveBtn.disabled = true;
    retrieveBtn.innerHTML = '<span class="btn-icon">⏳</span> Wird abgerufen...';
    
    try {
        const response = await fetch(`/api/retrieve/${code}`);
        const text = await response.text();
        console.log('Serverantwort:', text);
        console.log('Status:', response.status);
        console.log('Header:', Array.from(response.headers.entries()));
        let data;
        let errorInResponse = false;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            errorInResponse = true;
            console.error('Fehler beim Parsen der Serverantwort:', parseError);
            console.error('Raw Response:', text);
        }
        if (response.status === 429) {
            retrieveResult.style.display = 'block';
            const contentDiv = document.getElementById('retrieved-content');
            contentDiv.innerHTML = `
                <div class="error-box">
                    <div class="error-icon">🚦</div>
                    <div class="error-title">Zu viele Anfragen</div>
                    <div class="error-message">Du hast das Anfrage-Limit erreicht.<br>Bitte warte einige Minuten, bevor du es erneut versuchst.<br><span style='color:#2563eb;font-size:0.98em;'>Maximal 1000 Anfragen pro 15 Minuten erlaubt.</span></div>
                </div>
            `;
            document.getElementById('retrieved-type').textContent = '';
            document.getElementById('retrieved-views').textContent = '';
            document.getElementById('retrieved-expiry').textContent = '';
            if (expiryInterval) {
                clearInterval(expiryInterval);
                expiryInterval = null;
            }
            showToast('Zu viele Anfragen – bitte warte kurz!', 'error');
            retrieveBtn.disabled = false;
            retrieveBtn.innerHTML = '<span class="btn-icon">🔍</span> Abrufen';
            return;
        }
        if (response.status !== 200 || errorInResponse || (data && data.error)) {
            retrieveResult.style.display = 'block';
            const contentDiv = document.getElementById('retrieved-content');
            contentDiv.innerHTML = `
                <div class="error-box">
                    <div class="error-icon">⌛</div>
                    <div class="error-title">Code nicht gefunden oder abgelaufen</div>
                    <div class="error-message">Der eingegebene Code existiert nicht mehr oder ist bereits abgelaufen.<br>Bitte überprüfe den Code oder erstelle einen neuen Upload.</div>
                </div>
            `;
            document.getElementById('retrieved-type').textContent = '';
            document.getElementById('retrieved-views').textContent = '';
            document.getElementById('retrieved-expiry').textContent = '';
            if (expiryInterval) {
                clearInterval(expiryInterval);
                expiryInterval = null;
            }
            showToast('Code nicht gefunden oder abgelaufen', 'error');
            retrieveBtn.disabled = false;
            retrieveBtn.innerHTML = '<span class="btn-icon">🔍</span> Abrufen';
            return;
        }
        
        if (data.success) {
            displayRetrievedContent(data);
            showToast('Inhalt erfolgreich abgerufen!', 'success');
        } else {
            showToast(data.error || 'Code nicht gefunden', 'error');
        }
    } catch (error) {
        console.error('Netzwerkfehler beim Abrufen:', error);
        retrieveResult.style.display = 'block';
        const contentDiv = document.getElementById('retrieved-content');
        contentDiv.innerHTML = `<div style='color:red;'><b>Netzwerkfehler!</b><br>${escapeHtml(error.toString())}</div>`;
        document.getElementById('retrieved-type').textContent = 'Fehler';
        document.getElementById('retrieved-views').textContent = '';
        showToast('Netzwerkfehler beim Abrufen', 'error');
    } finally {
        retrieveBtn.disabled = false;
        retrieveBtn.innerHTML = '<span class="btn-icon">🔍</span> Abrufen';
    }
});

// Display Retrieved Content
function displayRetrievedContent(data) {
    console.log('Displaying retrieved content:', data);
    
    const typeBadge = document.getElementById('retrieved-type');
    const viewsSpan = document.getElementById('retrieved-views');
    const expirySpan = document.getElementById('retrieved-expiry');
    const contentDiv = document.getElementById('retrieved-content');
    const contentActions = document.querySelector('.content-actions');

    // Countdown-Timer für Ablauf
    if (expiryInterval) {
        clearInterval(expiryInterval);
        expiryInterval = null;
    }
    if (data.expiresAt) {
        updateExpiryCountdown(expirySpan, data.expiresAt);
        expiryInterval = setInterval(() => {
            updateExpiryCountdown(expirySpan, data.expiresAt);
        }, 1000);
    } else {
        expirySpan.textContent = '';
    }

    if (data.type === 'files') {
        // Mehrere Dateien anzeigen - Kopier-Buttons ausblenden
        console.log('Files data:', { 
            totalFiles: data.totalFiles,
            files: data.files
        });
        
        typeBadge.textContent = `📁 ${data.totalFiles} Datei${data.totalFiles !== 1 ? 'en' : ''}`;
        viewsSpan.textContent = `${data.views} Aufruf${data.views !== 1 ? 'e' : ''}`;
        
        // Kopier-Buttons ausblenden
        if (contentActions) {
            contentActions.style.display = 'none';
        }
        
        const filesList = data.files.map((file, index) => {
            // Prüfe, ob es ein Bild ist
            const isImage = /^image\//.test(file.mimetype);
            
            return `
                <div class="file-item">
                    <div class="file-header">
                        <span class="file-icon">${isImage ? '🖼️' : '📁'}</span>
                        <div class="file-details">
                            <h4>${file.originalname}</h4>
                            <p>Größe: ${formatFileSize(file.size)}</p>
                            <p>Typ: ${file.mimetype}</p>
                        </div>
                    </div>
                    ${isImage ? `
                        <div class="file-preview">
                            <img src="${file.downloadUrl}" alt="${file.originalname}" class="file-thumbnail" loading="lazy">
                        </div>
                    ` : ''}
                    <div class="file-actions">
                        <a class="btn btn-primary" href="${file.downloadUrl}" download="${file.originalname}">
                            <span class="btn-icon">⬇️</span>
                            Herunterladen
                        </a>
                        ${isImage ? `
                            <a class="btn btn-secondary" href="${file.downloadUrl}" target="_blank">
                                <span class="btn-icon">👁️</span>
                                Anzeigen
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        const fileInfo = `
            <div class="files-display">
                <div class="files-header">
                    <h3>${data.totalFiles} Datei${data.totalFiles !== 1 ? 'en' : ''} verfügbar</h3>
                </div>
                <div class="files-list">
                    ${filesList}
                </div>
            </div>
        `;
        contentDiv.innerHTML = fileInfo;
    } else {
        // Text-Inhalt anzeigen - Kopier-Buttons anzeigen
        typeBadge.textContent = '📝 Text';
        viewsSpan.textContent = `${data.views} Aufruf${data.views !== 1 ? 'e' : ''}`;
        contentDiv.innerHTML = data.content;
        
        // Kopier-Buttons anzeigen
        if (contentActions) {
            contentActions.style.display = 'flex';
        }
    }
    
    retrieveResult.style.display = 'block';
}

// Download File Function (muss global verfügbar sein)
window.downloadFile = function(url, filename) {
    console.log('Download requested:', { url, filename });
    
    try {
        // Direkter Download mit Link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Füge Link zum DOM hinzu
        document.body.appendChild(link);
        
        // Trigger Download
        link.click();
        
        // Entferne Link wieder
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);
        
        showToast('Download gestartet', 'success');
        console.log('Download initiated successfully');
        
    } catch (error) {
        console.error('Download error:', error);
        
        // Fallback: Öffne in neuem Tab
        try {
            window.open(url, '_blank');
            showToast('Datei in neuem Tab geöffnet', 'info');
        } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
            showToast('Download fehlgeschlagen', 'error');
        }
    }
};

// Copy Code
copyCodeBtn.addEventListener('click', () => {
    const code = generatedCode.textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Code in Zwischenablage kopiert!', 'success');
    }).catch(() => {
        showToast('Fehler beim Kopieren des Codes', 'error');
    });
});

// Code Input Auto-submit
codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        retrieveBtn.click();
    }
});

// Update Stats
async function updateStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        statsDisplay.textContent = `📊 ${data.totalEntries} / ${data.maxEntries} Einträge`;
    } catch (error) {
        console.error('Fehler beim Abrufen der Statistiken:', error);
    }
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
    
    // Remove on click
    toast.addEventListener('click', () => {
        toast.remove();
    });
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTypeDisplayName(type) {
    const typeNames = {
        'text': 'Text',
        'code': 'Code',
        'html': 'HTML',
        'markdown': 'Markdown',
        'javascript': 'JavaScript',
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'csharp': 'C#',
        'php': 'PHP',
        'ruby': 'Ruby',
        'go': 'Go',
        'rust': 'Rust',
        'sql': 'SQL',
        'css': 'CSS',
        'xml': 'XML',
        'json': 'JSON',
        'yaml': 'YAML',
        'bash': 'Bash',
        'powershell': 'PowerShell'
    };
    return typeNames[type] || type;
}

// Modal Functions
function showInfo() {
    document.getElementById('info-modal').style.display = 'flex';
}

function hideInfo() {
    document.getElementById('info-modal').style.display = 'none';
}

function showHelp() {
    document.getElementById('help-modal').style.display = 'flex';
}

function hideHelp() {
    document.getElementById('help-modal').style.display = 'none';
}

// Close modal when clicking outside
document.getElementById('info-modal').addEventListener('click', (e) => {
    if (e.target.id === 'info-modal') {
        hideInfo();
    }
});

document.getElementById('help-modal').addEventListener('click', (e) => {
    if (e.target.id === 'help-modal') {
        hideHelp();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateServerStats();
    updateStats();
    
    // Modal Button Event Listeners
    const infoButton = document.getElementById('info-btn');
    const helpButton = document.getElementById('help-btn');
    
    if (infoButton) {
        infoButton.addEventListener('click', showInfo);
    }
    
    if (helpButton) {
        helpButton.addEventListener('click', showHelp);
    }
    
    // Automatischer Abruf bei ?code=XXXX in der URL
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam && codeParam.length === 4) {
        // Tab wechseln
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="retrieve"]').classList.add('active');
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('retrieve-tab').classList.add('active');
        // Code eintragen und Abruf starten
        codeInput.value = codeParam;
        setTimeout(() => { retrieveBtn.click(); }, 200);
    }
    
    // Focus on content editor
    contentEditor.focus();
    
    // Handle paste events for images
    contentEditor.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    
                    // Insert at cursor position
                    const selection = window.getSelection();
                    const range = selection.getRangeAt(0);
                    range.insertNode(img);
                    range.collapse(false);
                };
                
                reader.readAsDataURL(blob);
                e.preventDefault();
                break;
            }
        }
    });
    
    // Auto-detect language when typing in code input
    contentInput.addEventListener('input', () => {
        if (contentTypeSelect.value === 'code') {
            const content = contentInput.value;
            if (content.trim()) {
                const detectedLang = detectLanguage(content);
                if (detectedLang !== 'text') {
                    contentTypeSelect.value = detectedLang;
                }
            }
        }
    });

    // Retrieve Tab Buttons
    const retrieveCopyTextBtn = document.querySelector('#retrieve-tab #copy-content-text-btn');
    const retrieveCopyFormattedBtn = document.querySelector('#retrieve-tab #copy-content-formatted-btn');
    
    if (retrieveCopyTextBtn) {
        retrieveCopyTextBtn.addEventListener('click', () => {
            const contentDiv = document.getElementById('retrieved-content');
            const text = contentDiv.textContent || contentDiv.innerText;
            
            navigator.clipboard.writeText(text).then(() => {
                showToast('Inhalt als Text kopiert!', 'success');
            }).catch(() => {
                showToast('Fehler beim Kopieren', 'error');
            });
        });
    }
    
    if (retrieveCopyFormattedBtn) {
        retrieveCopyFormattedBtn.addEventListener('click', () => {
            const contentDiv = document.getElementById('retrieved-content');
            
            if (navigator.clipboard && window.ClipboardItem) {
                const html = contentDiv.innerHTML;
                const text = contentDiv.textContent || contentDiv.innerText;
                const blobHtml = new Blob([html], { type: 'text/html' });
                const blobText = new Blob([text], { type: 'text/plain' });
                
                navigator.clipboard.write([
                    new window.ClipboardItem({
                        'text/html': blobHtml,
                        'text/plain': blobText
                    })
                ]).then(() => {
                    showToast('Inhalt mit Formatierung kopiert!', 'success');
                }).catch(() => {
                    showToast('Fehler beim Kopieren', 'error');
                });
            } else {
                showToast('Formatierung wird in diesem Browser nicht unterstützt', 'warning');
            }
        });
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to share
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.querySelector('#share-tab').classList.contains('active')) {
            shareBtn.click();
        }
    }
    
    // Ctrl/Cmd + K to clear
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearBtn.click();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        hideInfo();
        hideHelp();
    }
});

// File Input Event Listener
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        addFilesToSelection(files);
        // Reset input für erneute Auswahl
        e.target.value = '';
    }
});

// Select File Button
selectFileBtn.addEventListener('click', () => {
    fileInput.click();
});

// Drag & Drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        addFilesToSelection(files);
    }
});

function addFilesToSelection(files) {
    files.forEach(file => {
        // Verbesserte Validierung für mobile Dateien
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'image/heic', 'image/heif', // iPhone HEIC Format
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];
        
        // Prüfe Dateityp oder Dateiendung
        const isValidType = allowedTypes.includes(file.type) || 
                           /\.(jpg|jpeg|png|gif|webp|heic|heif|pdf|docx|xlsx|txt)$/i.test(file.name);
        
        if (!isValidType) {
            showToast(`Dateityp nicht unterstützt: ${file.name}`, 'error');
            return;
        }
        
        if (file.size > 100 * 1024 * 1024) { // 100 MB
            showToast(`Datei zu groß: ${file.name} (max. 100 MB)`, 'error');
            return;
        }
        
        // Prüfe, ob Datei bereits ausgewählt ist (verbesserte Duplikatserkennung)
        const isDuplicate = selectedFilesArray.find(f => 
            f.name === file.name && 
            f.size === file.size && 
            f.lastModified === file.lastModified
        );
        
        if (!isDuplicate) {
            selectedFilesArray.push(file);
            showToast(`Datei hinzugefügt: ${file.name}`, 'success');
        } else {
            showToast(`Datei bereits ausgewählt: ${file.name}`, 'warning');
        }
    });
    
    updateFilesDisplay();
}

function updateFilesDisplay() {
    if (selectedFilesArray.length > 0) {
        selectedFiles.style.display = 'block';
        
        filesList.innerHTML = selectedFilesArray.map((file, index) => `
            <div class="file-item">
                <div class="file-header">
                    <span class="file-icon">📁</span>
                    <div class="file-details">
                        <h4>${file.name}</h4>
                        <p>Größe: ${formatFileSize(file.size)}</p>
                        <p>Typ: ${file.type}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-secondary btn-sm" onclick="removeFile(${index})">
                        <span class="btn-icon">🗑️</span>
                        Entfernen
                    </button>
                </div>
            </div>
        `).join('');
    } else {
        selectedFiles.style.display = 'none';
    }
}

function removeFile(index) {
    selectedFilesArray.splice(index, 1);
    updateFilesDisplay();
}

// Clear Files Button
clearFilesBtn.addEventListener('click', () => {
    selectedFilesArray = [];
    updateFilesDisplay();
    showToast('Alle Dateien entfernt', 'success');
});

// Upload Share Button
uploadShareBtn.addEventListener('click', async () => {
    if (selectedFilesArray.length === 0) {
        showToast('Bitte wählen Sie mindestens eine Datei aus', 'warning');
        return;
    }
    
    const uploadExpirySelect = document.getElementById('upload-expiry-select');
    const expiryMinutes = parseInt(uploadExpirySelect.value, 10) || 5;
    
    uploadShareBtn.disabled = true;
    uploadShareBtn.innerHTML = '<span class="btn-icon">⏳</span> Wird hochgeladen...';
    
    try {
        const formData = new FormData();
        selectedFilesArray.forEach(file => {
            formData.append('files', file);
        });
        formData.append('expiryMinutes', expiryMinutes);
        const response = await fetch('/api/upload-multiple', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            uploadedCount.textContent = data.totalFiles;
            uploadedCode.textContent = data.code;
            const baseUrl = window.location.protocol + '//' + window.location.host;
            const directLink = `${baseUrl}/?code=${data.code}`;
            document.getElementById('uploaded-link').innerHTML = `<a href='${directLink}' target='_blank'>${directLink}</a>`;
            
            // QR-Code für Upload generieren
            document.getElementById('upload-qr-code-img').src = `/api/qr?text=${encodeURIComponent(directLink)}`;
            
            uploadResult.style.display = 'block';
            showToast('Dateien erfolgreich hochgeladen!', 'success');
            updateStats();
            
            // Reset
            selectedFilesArray = [];
            updateFilesDisplay();
        } else {
            showToast(data.error || 'Upload fehlgeschlagen', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Netzwerkfehler beim Upload', 'error');
    } finally {
        uploadShareBtn.disabled = false;
        uploadShareBtn.innerHTML = '<span class="btn-icon">📤</span> Dateien teilen';
    }
});

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Copy Upload Code Button
copyUploadCodeBtn.addEventListener('click', () => {
    const code = uploadedCode.textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Code kopiert!', 'success');
    }).catch(() => {
        showToast('Fehler beim Kopieren', 'error');
    });
});

function updateExpiryCountdown(element, expiresAt) {
    const now = Date.now();
    const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
    if (diff <= 0) {
        element.textContent = '⏳ Code abgelaufen';
        element.style.color = '#ef4444';
        if (expiryInterval) {
            clearInterval(expiryInterval);
            expiryInterval = null;
        }
        return;
    }
    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    element.textContent = `⏳ Noch ${min}:${sec.toString().padStart(2, '0')} Minuten gültig`;
    element.style.color = '#2563eb';
}

// Live-Update der Server-Kapazität
async function updateServerStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        const free = data.maxEntries - data.totalEntries;
        const used = data.totalEntries;
        const max = data.maxEntries;
        document.getElementById('stats-free').textContent = free;
        document.getElementById('stats-used').textContent = used;
        document.getElementById('stats-max').textContent = max;
        const percent = Math.min(100, Math.round((used / max) * 100));
        document.getElementById('stats-bar-inner').style.width = percent + '%';
    } catch (e) {
        // Fehler ignorieren, falls Server nicht erreichbar
    }
}

setInterval(updateServerStats, 5000);

// Copy Link Button (Text)
document.getElementById('copy-link-btn').addEventListener('click', () => {
    const link = document.getElementById('generated-link').innerText;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Link kopiert!', 'success');
    }).catch(() => {
        showToast('Fehler beim Kopieren', 'error');
    });
});

// Copy Link Button (Upload)
document.getElementById('copy-upload-link-btn').addEventListener('click', () => {
    const link = document.getElementById('uploaded-link').innerText;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Link kopiert!', 'success');
    }).catch(() => {
        showToast('Fehler beim Kopieren', 'error');
    });
});

// QR Code Download Button
document.getElementById('download-qr-btn').addEventListener('click', () => {
    const img = document.getElementById('qr-code-img');
    if (!img || !img.src) {
        showToast('Kein QR-Code zum Herunterladen vorhanden!', 'error');
        return;
    }
    
    // Hole das Bild als Blob und lade es herunter
    fetch(img.src)
        .then(res => res.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'qr-code.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('QR-Code erfolgreich heruntergeladen!', 'success');
        })
        .catch(() => {
            showToast('Fehler beim Herunterladen des QR-Codes!', 'error');
        });
});

// Upload QR Code Download Button
document.getElementById('download-upload-qr-btn').addEventListener('click', () => {
    const img = document.getElementById('upload-qr-code-img');
    if (!img || !img.src) {
        showToast('Kein QR-Code zum Herunterladen vorhanden!', 'error');
        return;
    }
    
    // Hole das Bild als Blob und lade es herunter
    fetch(img.src)
        .then(res => res.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'upload-qr-code.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('QR-Code erfolgreich heruntergeladen!', 'success');
        })
        .catch(() => {
            showToast('Fehler beim Herunterladen des QR-Codes!', 'error');
        });
}); 