# Luma 💕

Una bellissima app di dating Flutter che connette cuori solitari con persone meravigliose nelle vicinanze.

## ✨ Caratteristiche

- 🔐 Autenticazione sicura con Firebase Auth
- 💬 Chat in tempo reale con Firestore
- 📍 Geolocalizzazione per trovare persone vicine
- 🎨 UI elegante con animazioni fluide
- 🌙 Tema scuro e chiaro
- 📱 Design responsive per tutte le piattaforme

## 🚀 Come iniziare

### Prerequisiti

- Flutter SDK (versione 3.0 o superiore)
- Dart SDK (versione 2.19 o superiore)
- Un account Google per Firebase
- Android Studio o VS Code con estensioni Flutter

### 1. Clona il repository

```bash
git clone https://github.com/rberto4/Luma-test.git
cd luma
```

### 2. Installa le dipendenze

```bash
flutter pub get
```

### 3. Configura Firebase

#### 3.1 Crea un progetto Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Clicca su "Crea un progetto" o "Add project"
3. Inserisci il nome del progetto (es. "luma-dating-app")
4. Abilita Google Analytics se desideri
5. Scegli il tuo account Google Analytics
6. Clicca su "Crea progetto"

#### 3.2 Abilita i servizi Firebase

Nel tuo progetto Firebase, vai su:

**Authentication:**
1. Nella sidebar, clicca su "Authentication"
2. Vai su "Sign-in method"
3. Abilita "Email/Password"
4. Abilita "Google" (opzionale, ma raccomandato)

**Firestore Database:**
1. Nella sidebar, clicca su "Firestore Database"
2. Clicca su "Crea database"
3. Scegli "Inizia in modalità test" per sviluppo
4. Seleziona una location (es. "europe-west1")
5. Clicca su "Fine"

#### 3.3 Configura le piattaforme

**Per Android:**
1. Nel tuo progetto Firebase, clicca sull'icona Android
2. Inserisci il nome del package: `com.example.luma`
3. Scarica il file `google-services.json`
4. Copia il file in `android/app/google-services.json`

**Per iOS:**
1. Nel tuo progetto Firebase, clicca sull'icona iOS
2. Inserisci il Bundle ID: `com.example.luma`
3. Scarica il file `GoogleService-Info.plist`
4. Copia il file in `ios/Runner/GoogleService-Info.plist`

#### 3.4 Genera le opzioni Firebase per Flutter

1. Installa Firebase CLI se non l'hai già fatto:
```bash
npm install -g firebase-tools
```

2. Effettua il login:
```bash
firebase login
```

3. Associa il progetto Flutter al progetto Firebase:
```bash
flutterfire configure --project=luma-dating-app
```

Questo comando genererà automaticamente il file `lib/firebase_options.dart`.

### 4. Configura le variabili d'ambiente (Opzionale)

Se hai bisogno di variabili d'ambiente personalizzate, crea un file `.env` nella root del progetto:

```env
# Esempio di variabili d'ambiente
API_KEY=your_api_key_here
FIREBASE_PROJECT_ID=luma-dating-app
```

### 5. Esegui l'app

**Per Android:**
```bash
flutter run
```

**Per iOS:**
```bash
flutter run
```

**Per Web:**
```bash
flutter run -d chrome
```

## 📁 Struttura del progetto

```
lib/
├── main.dart                 # Punto di ingresso dell'app
├── firebase_options.dart     # Configurazione Firebase
├── providers/                # State management con Provider
│   ├── auth_provider.dart
│   └── chat_provider.dart
├── models/                   # Modelli di dati
│   └── user.dart
├── view/                     # UI e schermate
│   ├── screens/
│   │   ├── authentication/
│   │   │   ├── login.dart
│   │   │   ├── register.dart
│   │   │   └── welcome.dart
│   │   └── home/
│   │       ├── home.dart
│   │       └── tabs/
│   └── widgets/              # Widget riutilizzabili
├── theme/                    # Tema e colori dell'app
│   ├── colors.dart
│   ├── constants.dart
│   └── theme.dart
└── controller/               # Logica di business
    └── interfaces/
```

## 🛠️ Tecnologie utilizzate

- **Flutter** - Framework UI
- **Dart** - Linguaggio di programmazione
- **Firebase** - Backend as a Service
  - Authentication
  - Firestore Database
  - Cloud Storage (futuro)
- **Provider** - State management
- **Google Fonts** - Font personalizzati
- **Material Design 3** - Design system

## 📱 Piattaforme supportate

- ✅ Android
- ✅ iOS
- ✅ Web
- ✅ macOS
- ✅ Windows
- ✅ Linux

## 🤝 Contributi

Le contribuzioni sono benvenute! Sentiti libero di aprire issue e pull request.

### Come contribuire:

1. Fork il progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle tue modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è distribuito sotto licenza MIT. Vedi il file `LICENSE` per maggiori dettagli.

## 📞 Contatti

Roberto - [@rberto4](https://github.com/rberto4)

Link del progetto: [https://github.com/rberto4/Luma-test](https://github.com/rberto4/Luma-test)

---

**Nota:** Assicurati di aver configurato correttamente Firebase prima di eseguire l'app. Se riscontri problemi, controlla la documentazione ufficiale di Firebase per Flutter.
