const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const QRCode = require('qrcode');

const app = express();

// Umgebungsvariablen für Entwicklungs- und Produktionsmodus
const isDevelopment = process.env.NODE_ENV !== 'production';
const PORT = isDevelopment ? (process.env.PORT || 8080) : (process.env.PORT || 443);

console.log(`🚀 Server-Modus: ${isDevelopment ? 'Entwicklung' : 'Produktion'}`);
console.log(`🌐 Port: ${PORT}`);

// SSL-Zertifikate nur im Produktionsmodus laden
let server;
if (isDevelopment) {
    // Entwicklungsmodus: HTTP Server ohne SSL
    server = app;
    console.log('🔧 Entwicklungsmodus: HTTP Server ohne SSL');
} else {
    // Produktionsmodus: HTTPS Server mit SSL-Zertifikaten
    try {
        const options = {
            cert: fs.readFileSync('/etc/letsencrypt/live/idefix.cbubble.com/fullchain.pem'),
            key: fs.readFileSync('/etc/letsencrypt/live/idefix.cbubble.com/privkey.pem')
        };
        server = https.createServer(options, app);
        console.log('🔒 Produktionsmodus: HTTPS Server mit SSL-Zertifikaten');
    } catch (error) {
        console.error('❌ Fehler beim Laden der SSL-Zertifikate:', error.message);
        console.log('🔄 Fallback auf HTTP Server...');
        server = app;
    }
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 1000, // Maximal 1000 Requests pro IP
    message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut.'
});
app.use('/api/', limiter);

// In-Memory Storage (maximal 100 Einträge)
const storage = new Map();
const MAX_ENTRIES = 100;

// Hilfsfunktion zum Generieren eines 4-stelligen Codes
function generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Hilfsfunktion zum Bereinigen alter Einträge
function cleanupStorage() {
    if (storage.size >= MAX_ENTRIES) {
        const entries = Array.from(storage.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toDelete = entries.slice(0, storage.size - MAX_ENTRIES + 1);
        toDelete.forEach(([code]) => {
            const entry = storage.get(code);
            if (entry && entry.type === 'files' && entry.files) {
                // Alle Dateien löschen
                entry.files.forEach(file => {
                    const filePath = path.join(uploadPath, file.filename);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (error) {
                            console.error('Fehler beim Löschen in Cleanup:', error);
                        }
                    }
                });
            }
            storage.delete(code);
        });
    }
}

// Multer für Datei-Uploads
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}
const storageUpload = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({
    storage: storageUpload,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
    fileFilter: function (req, file, cb) {
        const allowed = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'image/heic', 'image/heif', // iPhone HEIC Format
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'text/plain'
        ];
        
        // Prüfe MIME-Type oder Dateiendung
        const isValidMimeType = allowed.includes(file.mimetype);
        const isValidExtension = /\.(jpg|jpeg|png|gif|webp|heic|heif|pdf|docx|xlsx|txt)$/i.test(file.originalname);
        
        if (isValidMimeType || isValidExtension) {
            cb(null, true);
        } else {
            console.log('Dateityp abgelehnt:', { 
                mimetype: file.mimetype, 
                originalname: file.originalname 
            });
            cb(new Error(`Dateityp nicht erlaubt: ${file.originalname} (${file.mimetype})`));
        }
    }
});

// API Routes
app.post('/api/share', (req, res) => {
    try {
        const { content, expiryMinutes } = req.body;
        console.log('POST /api/share:', { contentLength: content ? content.length : 0 });
        
        if (!content || content.trim() === '') {
            console.warn('Leerer Inhalt empfangen!');
            res.type('application/json');
            return res.status(400).json({ error: 'Inhalt darf nicht leer sein' });
        }

        // Bereinige alten Speicher
        cleanupStorage();

        // Generiere eindeutigen Code
        let code;
        let tries = 0;
        do {
            code = generateCode();
            tries++;
            if (tries > 20) throw new Error('Konnte keinen eindeutigen Code generieren');
        } while (storage.has(code));

        // Speichere den Inhalt
        storage.set(code, {
            type: 'text',
            content: content.trim(),
            timestamp: Date.now(),
            expiryMinutes: parseInt(expiryMinutes, 10) || 5,
            views: 0
        });

        console.log('Inhalt gespeichert:', { code, length: content.length });
        res.type('application/json');
        res.json({ 
            success: true, 
            code: code,
            message: 'Inhalt erfolgreich geteilt'
        });
    } catch (error) {
        console.error('Fehler beim Teilen:', error);
        res.type('application/json');
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
    }
});

app.get('/api/retrieve/:code', (req, res) => {
    try {
        const { code } = req.params;
        console.log('GET /api/retrieve:', code);
        
        if (!code || code.length !== 4) {
            console.warn('Ungültiger Abruf-Code:', code);
            res.type('application/json');
            return res.status(400).json({ error: 'Ungültiger Code' });
        }

        const entry = storage.get(code);
        
        if (!entry) {
            console.warn('Code nicht gefunden:', code);
            res.type('application/json');
            return res.status(404).json({ error: 'Code nicht gefunden' });
        }

        // Ablaufprüfung für alle Eintragstypen
        const expiryMinutes = entry.expiryMinutes || 5;
        const expiryMs = expiryMinutes * 60 * 1000;
        if (Date.now() - entry.timestamp > expiryMs) {
            // Sofort löschen, wenn abgelaufen
            if (entry.type === 'files' && entry.files) {
                entry.files.forEach(file => {
                    const filePath = path.join(uploadPath, file.filename);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                            console.log('Ablauf (Abruf): Datei gelöscht:', filePath);
                        } catch (error) {
                            console.error('Ablauf (Abruf): Fehler beim Löschen:', error);
                        }
                    }
                });
            }
            storage.delete(code);
            console.log('Ablauf (Abruf): Code gelöscht:', code);
            res.type('application/json');
            return res.status(404).json({ error: 'Code nicht gefunden' });
        }

        // Erhöhe View-Counter
        entry.views++;
        storage.set(code, entry);

        if (entry.type === 'files') {
            // Mehrere Dateien abrufen
            console.log('Dateien abgerufen:', { code, fileCount: entry.files.length });
            
            const expiresAt = entry.timestamp + (entry.expiryMinutes || 5) * 60 * 1000;
            res.type('application/json');
            res.json({
                success: true,
                type: 'files',
                files: entry.files.map(file => ({
                    ...file,
                    downloadUrl: `/uploads/${file.filename}`
                })),
                views: entry.views,
                created: entry.timestamp,
                totalFiles: entry.files.length,
                expiresAt
            });
        } else {
            // Text-Inhalt abrufen
            const expiresAt = entry.timestamp + (entry.expiryMinutes || 5) * 60 * 1000;
            console.log('Inhalt abgerufen:', { code, length: entry.content.length });
            res.type('application/json');
            res.json({
                success: true,
                type: 'text',
                content: entry.content,
                views: entry.views,
                created: entry.timestamp,
                expiresAt
            });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen:', error);
        res.type('application/json');
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
    }
});

app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            totalEntries: storage.size,
            maxEntries: MAX_ENTRIES
        };
        res.type('application/json');
        res.json(stats);
    } catch (error) {
        console.error('Fehler beim Abrufen der Statistiken:', error);
        res.type('application/json');
        res.status(500).json({ error: 'Interner Serverfehler', details: error.message });
    }
});

// Upload-API
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Keine Datei hochgeladen' });
        }
        const expiryMinutes = parseInt(req.body.expiryMinutes, 10) || 5;
        // Bereinige alten Speicher
        cleanupStorage();

        // Generiere eindeutigen Code
        let code;
        let tries = 0;
        do {
            code = generateCode();
            tries++;
            if (tries > 20) throw new Error('Konnte keinen eindeutigen Code generieren');
        } while (storage.has(code));

        // Prüfe, ob bereits ein Upload-Session für diesen Code existiert
        let entry = storage.get(code);
        if (!entry || entry.type !== 'files') {
            // Neue Upload-Session erstellen
            entry = {
                type: 'files',
                files: [],
                timestamp: Date.now(),
                expiryMinutes,
                views: 0
            };
            storage.set(code, entry);
        }

        // Datei zur Session hinzufügen
        const fileInfo = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        };
        entry.files.push(fileInfo);

        console.log('Datei zu Upload-Session hinzugefügt:', { code, filename: req.file.filename, totalFiles: entry.files.length });
        res.json({
            success: true,
            code: code,
            originalname: req.file.originalname,
            size: req.file.size,
            totalFiles: entry.files.length,
            message: 'Datei erfolgreich hochgeladen'
        });
    } catch (error) {
        console.error('Fehler beim Upload:', error);
        res.status(500).json({ error: 'Fehler beim Upload', details: error.message });
    }
});

// Multi-File Upload API
app.post('/api/upload-multiple', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            console.log('Upload ohne Dateien empfangen');
            return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
        }
        
        console.log('Upload empfangen:', {
            fileCount: req.files.length,
            files: req.files.map(f => ({
                originalname: f.originalname,
                mimetype: f.mimetype,
                size: f.size
            }))
        });
        
        const expiryMinutes = parseInt(req.body.expiryMinutes, 10) || 5;
        
        // Bereinige alten Speicher
        cleanupStorage();

        // Generiere eindeutigen Code
        let code;
        let tries = 0;
        do {
            code = generateCode();
            tries++;
            if (tries > 20) throw new Error('Konnte keinen eindeutigen Code generieren');
        } while (storage.has(code));

        // Erstelle neue Upload-Session
        const entry = {
            type: 'files',
            files: [],
            timestamp: Date.now(),
            expiryMinutes,
            views: 0
        };

        // Alle Dateien zur Session hinzufügen
        req.files.forEach(file => {
            const fileInfo = {
                filename: file.filename,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size
            };
            entry.files.push(fileInfo);
            console.log('Datei verarbeitet:', fileInfo);
        });

        storage.set(code, entry);

        console.log('Upload erfolgreich:', { code, fileCount: entry.files.length });
        res.json({
            success: true,
            code: code,
            totalFiles: entry.files.length,
            message: 'Dateien erfolgreich hochgeladen'
        });
    } catch (error) {
        console.error('Fehler beim Multi-Upload:', error);
        res.status(500).json({ 
            error: 'Fehler beim Upload', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Statische Bereitstellung der Uploads
app.use('/uploads', express.static(uploadPath));

// QR-Code Generierung API
app.get('/api/qr', async (req, res) => {
    try {
        const text = req.query.text;
        if (!text) {
            return res.status(400).json({ error: 'Text ist erforderlich' });
        }
        // QR-Code als PNG generieren
        const qrCodeBuffer = await QRCode.toBuffer(text, {
            type: 'image/png',
            width: 200,
            margin: 2,
            color: {
                dark: '#111111',      // fast schwarz
                light: '#e5e7eb'      // hellgrau (Tailwind: gray-200)
            }
        });
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 Stunde Cache
        res.send(qrCodeBuffer);
    } catch (error) {
        console.error('Fehler bei QR-Code-Generierung:', error);
        res.status(500).json({ error: 'Fehler bei QR-Code-Generierung' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Error Handler:', err);
    
    // Multer Fehler behandeln
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'Datei zu groß', 
                details: 'Maximale Dateigröße ist 100 MB' 
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                error: 'Zu viele Dateien', 
                details: 'Maximal 10 Dateien erlaubt' 
            });
        }
        return res.status(400).json({ 
            error: 'Upload-Fehler', 
            details: err.message 
        });
    }
    
    // Dateityp-Fehler behandeln
    if (err.message && err.message.includes('Dateityp nicht erlaubt')) {
        return res.status(400).json({ 
            error: 'Dateityp nicht unterstützt', 
            details: err.message 
        });
    }
    
    console.error(err.stack);
    res.status(500).json({ error: 'Etwas ist schief gelaufen!' });
});

// Automatisches Löschen abgelaufener Codes und Dateien (individuelle Gültigkeit)
setInterval(() => {
    const now = Date.now();
    console.log(`[CLEANUP] Prüfe abgelaufene Codes und Dateien: ${new Date(now).toLocaleString()}`);
    const deletedFiles = [];
    const deletedCodes = [];
    for (const [code, entry] of storage.entries()) {
        const expiryMinutes = entry.expiryMinutes || 5;
        const expiryMs = expiryMinutes * 60 * 1000;
        if (now - entry.timestamp > expiryMs) {
            if (entry.type === 'files' && entry.files) {
                entry.files.forEach(file => {
                    const filePath = path.join(uploadPath, file.filename);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                            deletedFiles.push(filePath);
                        } catch (error) {
                            console.error('Ablauf: Fehler beim Löschen:', error);
                        }
                    }
                });
            }
            storage.delete(code);
            deletedCodes.push(code);
        }
    }
    if (deletedFiles.length > 0) {
        console.log(`[CLEANUP] Gelöschte Dateien:`, deletedFiles);
    }
    if (deletedCodes.length > 0) {
        console.log(`[CLEANUP] Entfernte Codes:`, deletedCodes);
    }
}, 60 * 1000); // alle 60 Sekunden prüfen

// Server starten
server.listen(PORT, '0.0.0.0', () => {
    const protocol = isDevelopment ? 'HTTP' : 'HTTPS';
    const url = isDevelopment ? `http://localhost:${PORT}` : `https://0.0.0.0:${PORT}`;
    console.log(`🚀 ${protocol} Server läuft auf ${url}`);
    console.log(`📊 Maximal ${MAX_ENTRIES} Einträge werden im Speicher gehalten`);
    if (!isDevelopment) {
        console.log(`🔒 SSL-Zertifikate von idefix.cbubble.com geladen`);
    }
});

// Globale Fehlerbehandlung
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
}); 