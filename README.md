# Secure Copy & Paste 📋

Eine moderne und sichere Copy & Paste Webseite mit Code-Generierung für die einfache Freigabe von Text und Code.

## 🚀 Features

- **Sichere Text- und Code-Freigabe** - Teilen Sie Inhalte über 4-stellige Codes
- **QR-Code-Generierung** - Automatische QR-Codes für einfachen mobilen Zugriff
- **Unterstützung für verschiedene Inhaltstypen** - Text, Code, HTML, Markdown
- **Rich Text Editor** - Formatierungstools für Text (Fett, Kursiv, Unterstreichung, Code)
- **Bildunterstützung** - Einfügen von Bildern per Drag & Drop oder Copy & Paste
- **Datei-Upload** - Sichere Freigabe von Dateien (Bilder, PDFs, Dokumente)
- **Responsive Design** - Optimiert für Desktop, Tablet und Mobile
- **Automatische Bereinigung** - Maximal 100 Einträge im Speicher
- **Keine dauerhafte Speicherung** - Alle Daten werden nur temporär gespeichert
- **Moderne Benutzeroberfläche** - Elegantes Design mit Toast-Benachrichtigungen
- **Keyboard Shortcuts** - Schnelle Bedienung über Tastenkombinationen

## 🛠️ Technologie-Stack

- **Backend**: Node.js mit Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: Moderne CSS mit CSS Custom Properties
- **Sicherheit**: Helmet.js, CORS, Rate Limiting
- **Performance**: Compression, optimierte Assets
- **QR-Codes**: QRCode.js für dynamische QR-Code-Generierung

## 📦 Installation

### Voraussetzungen

- Node.js (Version 14 oder höher)
- npm oder yarn

### Schritte

1. **Repository klonen oder Dateien herunterladen**
   ```bash
   git clone <repository-url>
   cd sharepaste
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Server starten**

   **Entwicklungsmodus (HTTP auf Port 8080):**
   ```bash
   npm run dev
   ```
   
   **Produktionsmodus (HTTPS auf Port 443):**
   ```bash
   npm start
   ```
   
   **Windows Entwicklungsmodus:**
   ```bash
   npm run dev:windows
   ```

4. **Browser öffnen**
   - Entwicklung: `http://localhost:8080`
  

## 🔧 Umgebungsvariablen

- `NODE_ENV`: Bestimmt den Server-Modus
  - `development`: HTTP Server auf Port 8080 (Standard)
  - `production`: HTTPS Server auf Port 443 mit SSL-Zertifikaten
- `PORT`: Überschreibt den Standard-Port (optional)

## 🎯 Verwendung

### Inhalte teilen

1. Öffnen Sie die Webseite im Browser
2. Wechseln Sie zum "Teilen" Tab
3. Fügen Sie Ihren Text oder Code in das Eingabefeld ein
4. Wählen Sie den entsprechenden Inhaltstyp
5. Klicken Sie auf "Teilen"
6. Kopieren Sie den generierten 4-stelligen Code oder scannen Sie den QR-Code
7. Teilen Sie den Code mit dem Empfänger

### Dateien teilen

1. Wechseln Sie zum "Upload" Tab
2. Ziehen Sie Dateien in die Upload-Zone oder wählen Sie sie aus
3. Wählen Sie die Gültigkeitsdauer
4. Klicken Sie auf "Dateien teilen"
5. Kopieren Sie den Code oder scannen Sie den QR-Code

### Inhalte abrufen

1. Wechseln Sie zum "Abrufen" Tab
2. Geben Sie den 4-stelligen Code ein
3. Klicken Sie auf "Abrufen"
4. Der Inhalt wird angezeigt und kann kopiert werden

### QR-Codes

- **Automatische Generierung**: QR-Codes werden automatisch beim Teilen erstellt
- **Download**: QR-Codes können als PNG-Datei heruntergeladen werden
- **Mobile Nutzung**: QR-Codes können mit dem Smartphone gescannt werden

### Keyboard Shortcuts

- `Ctrl/Cmd + Enter` - Inhalt teilen
- `Ctrl/Cmd + K` - Inhalt löschen
- `Escape` - Modals schließen

## 🔧 API Endpunkte

### POST /api/share
Teilt einen Inhalt und generiert einen 4-stelligen Code.

**Request Body:**
```json
{
  "content": "Der zu teilende Inhalt",
  "type": "text|code|html|markdown"
}
```

**Response:**
```json
{
  "success": true,
  "code": "1234",
  "message": "Inhalt erfolgreich geteilt"
}
```

### GET /api/retrieve/:code
Ruft einen Inhalt anhand des 4-stelligen Codes ab.

**Response:**
```json
{
  "success": true,
  "content": "Der geteilte Inhalt",
  "type": "text",
  "views": 1,
  "created": 1640995200000
}
```

### GET /api/stats
Gibt Statistiken über die gespeicherten Einträge zurück.

**Response:**
```json
{
  "totalEntries": 5,
  "maxEntries": 100
}
```

## 🎨 Anpassungen

### Port ändern
Setzen Sie die Umgebungsvariable `PORT`:
```bash
PORT=8080 npm start
```

### Maximale Einträge ändern
Bearbeiten Sie die `MAX_ENTRIES` Konstante in `server.js`:
```javascript
const MAX_ENTRIES = 200; // Standard: 100
```

### Styling anpassen
Die CSS-Variablen in `public/styles.css` können angepasst werden:
```css
:root {
    --primary-color: #3b82f6;
    --background-color: #f8fafc;
    /* ... weitere Variablen */
}
```

## 🔒 Sicherheit

- **Rate Limiting**: Maximal 100 Requests pro IP in 15 Minuten
- **Content Security Policy**: Schutz vor XSS-Angriffen
- **CORS**: Cross-Origin Resource Sharing konfiguriert
- **Input Validation**: Alle Eingaben werden validiert
- **Keine dauerhafte Speicherung**: Daten werden nur im Arbeitsspeicher gehalten

## 📱 Browser-Unterstützung

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🤝 Beitragen

1. Fork das Repository
2. Erstellen Sie einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Committen Sie Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushen Sie zum Branch (`git push origin feature/AmazingFeature`)
5. Öffnen Sie einen Pull Request

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe die [LICENSE](LICENSE) Datei für Details.

## 🙏 Danksagungen

- [Inter Font](https://rsms.me/inter/) für die Typografie
- [Express.js](https://expressjs.com/) für das Backend-Framework
- [Helmet.js](https://helmetjs.github.io/) für Sicherheits-Header

## 📞 Support

Bei Fragen oder Problemen erstellen Sie bitte ein Issue im Repository oder kontaktieren Sie den Entwickler.

## 📱 API für Flutter-Integration

### 1. Text-Upload (mit Code-Generierung & Gültigkeit)
**POST** `/api/share`

**Body (JSON):**
```
{
  "content": "<dein Text oder HTML>",
  "expiryMinutes": 1 | 5 | 10 | 60
}
```
**Antwort:**
```
{
  "success": true,
  "code": "1234",
  "message": "Inhalt erfolgreich geteilt"
}
```

### 2. Datei-Upload (mit Code-Generierung & Gültigkeit)
**POST** `/api/upload-multiple`

**Body (multipart/form-data):**
- `files`: Mehrere Dateien (Feldname: `files`)
- `expiryMinutes`: 1 | 5 | 10 | 60

**Antwort:**
```
{
  "success": true,
  "code": "5678",
  "totalFiles": 2,
  "message": "Dateien erfolgreich hochgeladen"
}
```

### 3. Abrufen von Inhalten/Dateien
**GET** `/api/retrieve/:code`

**Antwort (Text):**
```
{
  "success": true,
  "type": "text",
  "content": "<dein Text>",
  "views": 1,
  "created": 1720000000000,
  "expiresAt": 1720000300000
}
```
**Antwort (Dateien):**
```
{
  "success": true,
  "type": "files",
  "files": [
    {
      "filename": "abc123.pdf",
      "originalname": "MeinDokument.pdf",
      "mimetype": "application/pdf",
      "size": 123456,
      "downloadUrl": "/uploads/abc123.pdf"
    },
    ...
  ],
  "views": 1,
  "created": 1720000000000,
  "expiresAt": 1720000300000
}
```

### Hinweise
- `expiryMinutes` gibt die gewünschte Gültigkeit in Minuten an (1, 5, 10, 60).
- Nach Ablauf sind Code und Dateien unwiderruflich gelöscht.
- Datei-Download erfolgt über die URL aus `downloadUrl`.
- Alle Endpunkte sind CORS-fähig und für Flutter-HTTP-Requests geeignet.

---

**Beispiel Flutter-Request (Text-Upload):**
```dart
final response = await http.post(
  Uri.parse('https://<dein-server>/api/share'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'content': 'Mein Text',
    'expiryMinutes': 10,
  }),
);
```

**Beispiel Flutter-Request (Datei-Upload):**
```dart
var request = http.MultipartRequest('POST', Uri.parse('https://<dein-server>/api/upload-multiple'));
request.fields['expiryMinutes'] = '10';
request.files.add(await http.MultipartFile.fromPath('files', '/pfad/zur/datei.pdf'));
final response = await request.send();
```

---

**Entwickelt mit ❤️ für einfache und sichere Text-Freigabe** 
