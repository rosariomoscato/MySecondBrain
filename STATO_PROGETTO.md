# Stato del Progetto — My Second Brain

Ultimo aggiornamento: 2026-06-05 (sessione 6) — refactoring struttura progetto (codebase appiattita)

## Cos'è

Web app Next.js che visualizza note markdown come grafo interattivo, con ricerca full-text e Q&A AI (RAG) con citazioni delle fonti. UI futuristica tema spazio. Configurabile per qualsiasi raccolta di note markdown.

## Stack

- Next.js 16, ShadCN UI, Tailwind CSS v4, vis-network, fuse.js, Vercel AI SDK
- framer-motion (animazioni), marked (markdown rendering)
- LLM: OpenRouter (modello configurabile da UI Impostazioni) via `data/settings.json` (fallback `.env.local`)
- GitHub: `https://github.com/rosariomoscato/MySecondBrain`
- Git author: `Rosario Moscato <ros.moscato@gmail.com>`

## Struttura chiave

```
MySecondBrain/                  ← root del repo
├── notes.config.json          ← configurazione build (source, pattern, filesDir, appName)
├── scripts/build-notes.ts     ← build pipeline (legge notes.config.json + CLI args)
├── notes/                     ← note sorgenti (gitignorato)
│   └── UpNote_2026-05-19_21-39-47/
│       ├── *.md               ← note markdown
│       └── Files/             ← allegati (immagini, PDF, video)
├── lib/
│   ├── types.ts               ← Note, GraphNode/Edge, CATEGORY_COLORS
│   ├── notes-loader.ts        ← caricamento note + getRelatedNotes()
│   ├── search-engine.ts       ← fuse.js doppio (text search + RAG con exact match boost)
│   └── settings.ts            ← read/write data/settings.json (notes + AI config, fallback env vars)
├── app/
│   ├── page.tsx               ← pagina principale con tutti gli stati UI
│   ├── layout.tsx             ← ThemeProvider + TooltipProvider + removeChild fix
│   ├── globals.css            ← tema futuro, glass-morphism, glow, markdown styles
│   └── api/
│       ├── ask/route.ts       ← RAG endpoint (filtro categoria)
│       ├── search/route.ts    ← fuse.js search (filtro categoria)
│       ├── summarize/route.ts ← riassunto nota singola via LLM
│       ├── rebuild/route.ts   ← re-index + reload (legge source/pattern da settings)
│       └── settings/
│           ├── route.ts       ← GET/PUT impostazioni (notes + AI)
│           ├── models/route.ts ← verifica chiave OpenRouter + lista modelli
│           └── browse/route.ts ← browse sottocartelle server
├── components/
│   ├── note-graph.tsx         ← vis-network grafo con tooltip hover + mini-preview card
│   ├── note-sheet.tsx         ← Panel laterale custom (framer-motion) con markdown + allegati + link + breadcrumb + note correlate + export (MD/PDF) + highlight
│   ├── search-bar.tsx         ← barra ricerca + selettore modalità + keyboard shortcuts + cronologia ricerche
│   ├── search-results.tsx     ← lista risultati con fade-in animato + navigazione tastiera
│   ├── rag-answer.tsx         ← chat multi-turno AI (cronologia, follow-up, fonti espandibili, export conversazione)
│   ├── sidebar-nav.tsx        ← sidebar categorie (filtro cliccabile)
│   ├── theme-toggle.tsx       ← dark/light toggle
│   ├── space-background.tsx   ← background spaziale animato (stelle, nebulose, stelle cadenti)
│   ├── statistics.tsx         ← dashboard statistiche (categorie, note più collegate, timeline)
│   └── settings-dialog.tsx    ← dialog impostazioni (tab Note: browse cartelle, pattern; tab AI: API key, modelli)
├── data/notes.json            ← generato dal build (gitignorato)
├── data/settings.json         ← impostazioni utente: notes source/pattern + AI key/model (gitignorato)
├── public/files/              ← allegati copiati dal build (gitignorato)
├── public/screenshots/        ← screenshot per README guida utente (7 immagini)
├── hooks/
│   ├── use-search-history.ts  ← hook cronologia ricerche (localStorage, max 20)
│   └── use-mobile.ts          ← hook responsive breakpoint
├── MIGLIORAMENTI.md           ← lista miglioramenti implementati
├── SECONDO_GIRO_MIGLIORAMENTI.md ← lista miglioramenti da implementare (secondo giro)
└── .env.local                 ← NEXT_PUBLIC_APP_NAME, LLM_PROVIDER, OPENROUTER_API_KEY, OPENROUTER_MODEL
```

## Come avviare

```bash
cd ~/Progetti/UpNote_Export
npm run dev
```

Il comando `npm run dev` esegue prima `build-notes.ts` poi `next dev`.

## Cosa fa il build (`build-notes.ts`)

1. Legge configurazione da `notes.config.json` (override CLI: `--source`, `--pattern`, `--files-dir`)
2. Trova tutte le cartelle nel percorso `source` che corrispondono al `pattern` (es. `UpNote_*`, `*` per tutte)
3. Merge file allegati dalla sottocartella `filesDir` (da più vecchio a più recente = più recente vince)
4. Se nomi duplicati → rinomina con suffisso e aggiorna riferimenti nelle note
5. Merge note per slug (stessa logica: più recente vince)
6. Estrae link interni `[testo](%23...)` e allegati `![...](Files/...)` e `[...](Files/...)`
7. Salva `data/notes.json` e copia file in `public/files/`
8. Flag `--cleanup` per eliminare export vecchi

### Configurazione (`notes.config.json`)

```json
{
  "source": "notes",
  "pattern": "UpNote_*",
  "filesDir": "Files",
  "appName": "My Second Brain",
  "appDescription": "Esplora e cerca nelle tue note UpNote con AI"
}
```

- `source`: percorso relativo alla root del progetto (o assoluto)
- `pattern`: pattern nomi cartella (`UpNote_*` = prefisso, `*` = tutte le cartelle, `nome_esatto` = match esatto)
- `filesDir`: nome della sottocartella con gli allegati (default `Files`)
- `appName`/`appDescription`: usati nei messaggi console del build
- Il nome dell'app nell'UI è configurato via `NEXT_PUBLIC_APP_NAME` in `.env.local`

### AI / RAG

- **Chat multi-turno** — la conversazione AI mantiene il contesto tra domande successive. Lo storico messaggi viene passato all'API che lo inoltra al LLM come `messages`. UI con chat thread (domande utente + risposte AI con fonti), input per follow-up in basso, pulsante "Nuova chat" per resettare, bottone "Esporta" per scaricare la conversazione come Markdown. Il prompt di sistema include il contesto note aggiornato per ogni domanda. Risposte renderizzate in markdown reale via `marked`
- **Sorgenti espandibili** — le fonti citate nella risposta AI sono espandibili con click (chevron): mostrano preview inline con categoria (badge colorato), snippet contenuto (300 char), e due pulsanti azione: "Leggi tutto" (apre NoteSheet) e "Apri nel grafo" (switch tab Grafo + zoom + selezione nodo). `NoteGraph` espone `focusNode()` via `useImperativeHandle`/`forwardRef`
- **Generazione riassunti** — bottone "Riassumi" nell'header del NoteSheet. Chiama `/api/summarize` che invia titolo + contenuto + categoria al LLM. Risposta in streaming mostrata in card dedicata (border cyan, icona Sparkles) con markdown renderizzato. Card dismissable con X. Si resetta automaticamente al cambio nota
- **RAG search migliorato** — boost per match esatti: le note che contengono le parole chiave della query vengono posizionate in cima ai risultati RAG, prima dei risultati fuzzy di fuse.js. Deduplicazione e merge dei risultati. Risolve il problema di note rilevanti non trovate (es. query specifiche come nomi propri)

- **Supporto qualsiasi cartella markdown** — percorso sorgente e pattern cartella configurabili via `notes.config.json` (rimosso hardcoded `UpNote_*`). Override CLI: `--source`, `--pattern`, `--files-dir`. Nome app nell'UI configurabile via `NEXT_PUBLIC_APP_NAME` in `.env.local`

### Grafica / UI

- **Animazioni transizione** — fade-in/slide con framer-motion su risultati ricerca, grafo e note sheet
- **Grafo interattivo migliorato** — tooltip React custom on hover con preview nota (titolo, abstract, categoria, link). Font color adattivo al tema (dark/light)
- **Layout note nel grafo** — nodi nota come mini-card box arrotondate con titolo + preview contenuto (80 char), bordo colorato per categoria
- **Tema animato** — background spaziale con stelle a 3 strati (parallax), nebulose animate, particelle fluttuanti, stelle cadenti. Colori adattivi dark/light
- **Empty state** — schermata iniziale con icona Brain animata, stat card (note/categorie/collegamenti), keyboard shortcuts hint
- **Markdown rendering** — note renderizzate con markdown reale (headers, liste, link, code, blockquote, tabelle) via `marked`. Link blu, apribili in nuova scheda. Fix escape underscore nei URL
- **NoteSheet tema adattivo** — background usa `bg-background/95` invece di colore hardcoded, si adatta a tema chiaro/scuro

### Funzionalità

- **Filtro per categoria** — sidebar cliccabile per filtrare grafo, risultati ricerca e RAG. Indicatore filtro con chip colorata e pulsante X
- **Breadcrumb di navigazione** — trail visibile nel NoteSheet quando si naviga tra note collegate. Link nel contenuto markdown e sezione "Collegamenti" sono cliccabili
- **Note correlate** — sezione nel NoteSheet con suggerimento automatico di note simili basato su backlink (+3), forward link (+3), link condivisi (+2), stessa categoria (+1)
- **Statistiche** — dashboard con: stat card (note, categorie, collegamenti, allegati), bar chart note per categoria, top 8 note più collegate (cliccabili), timeline creazione note, info contenuto medio
- **Keyboard shortcuts completi** — `/` focus ricerca, `Tab` cambia modalità, `Esc` chiude sheet, `↑↓` naviga risultati (con scroll automatico), `Enter` apre nota selezionata
- **Export nota singola** — dropdown con icona Download nell'header NoteSheet: esporta come Markdown (.md, blob download diretto) o PDF (finestra stampabile con HTML stilizzato). Zero dipendenze extra
- **Full-text highlight** — termini cercati evidenziati con `<mark class="search-highlight">` nel contenuto della nota aperta nel NoteSheet. Highlight applicato solo al testo visibile (non dentro tag HTML), case-insensitive. Stile adattivo dark/light con sfondo indigo
- **Cronologia ricerche** — ultime 20 ricerche salvate in localStorage (`upnote-search-history`). Dropdown "Ricerche recenti" al focus sulla search bar: mostra max 10 voci filtrate while-you-type, click per rilanciare, X per rimuovere singola voce, "Cancella tutto" per svuotare. Hook `useSearchHistory` con lazy init (no effect)

### Impostazioni

- **Dialog Impostazioni** — icona ⚙️ nell'header apre dialog modale con due tab: "Note" e "Intelligenza Artificiale"
- **Configurazione cartella note da UI** — tab Note con campo percorso sorgente + pulsante "Sfoglia" (mini file-browser che naviga sottocartelle dalla root del progetto). Campo pattern cartelle e sottocartella allegati. Pulsante "Salva e re-indicizza" aggiorna `notes.config.json` + `data/settings.json` e lancia il rebuild
- **Configurazione AI da UI** — tab AI con campo API Key OpenRouter (password input con toggle visibilità). Pulsante "Verifica chiave" testa la chiave chiamando `GET https://openrouter.ai/api/v1/models`. Se valida: dropdown searchable con lista modelli ordinati (free prima), ogni item mostra nome, ID, badge Free/Paid, context length. Pulsante "Salva" scrive in `data/settings.json`
- **Persistenza settings** — `data/settings.json` (gitignorato) con struttura `{ notes: { source, pattern, filesDir }, ai: { provider, openrouterApiKey, openrouterModel } }`. Le API route leggono da settings.json con fallback alle variabili d'ambiente in `.env.local`. Prima installazione: campi vuoti, l'utente configura tutto da UI

### Documentazione

- **README come guida utente** — README.md riscritto come guida completa con indice, sezioni per ogni funzionalità (grafo, ricerca, AI, impostazioni, keyboard shortcuts, statistiche), istruzioni primo avvio, configurazione avanzata per sviluppatori
- **7 screenshot** — catturati con Playwright CLI e inseriti nel README: grafo interattivo, ricerca testuale, chat AI con fonti, nota nel NoteSheet, impostazioni tab Note, impostazioni tab AI, dashboard statistiche
- **Pulsante Guida** — icona `HelpCircle` nell'header che apre il README su GitHub in una nuova scheda (`https://github.com/rosariomoscato/MySecondBrain#readme`)

## Decisioni prese

- RAG multi-turno: storico messaggi passato come `messages` al LLM, contesto note aggiornato per ogni domanda
- `@ai-sdk/openai` `.chat()` (non default) per Chat Completions API — la Responses API default non supporta multi-turno su OpenRouter
- RAG search: match esatti boostati sopra risultati fuzzy — note con termini della query sempre incluse nel contesto
- Risposte AI renderizzate come markdown via `marked` con citazioni convertite da `<em>` a `<span class="source-highlight">`
- Export conversazione AI via Blob API + URL.createObjectURL (stesso pattern di export nota)
- `@ai-sdk/openai` con `createOpenAI({ baseURL })` per tutti i provider
- Build leggendo `notes.config.json` per configurabilità (non hardcoded)
- Lingua italiana per UI e risposte AI
- NoteSheet custom con framer-motion invece del componente Sheet base-ui (bug removeChild)
- `marked` per markdown rendering (non react-markdown — conflitto DOM con base-ui)
- Patch `Node.prototype.removeChild` in `layout.tsx` per suppressione errore DOM noto di React 19 + base-ui
- Link UpNote hanno formato `"#Categoria | Titolo"` — risoluzione normalizza underscore e spazi
- Search state gestito in `page.tsx` (non in `SearchBar`) per permettere reset da "Cancella risultati"
- Export PDF via `window.open` + `window.print()` con HTML stilizzato (no lib PDF)
- Export MD via Blob API + URL.createObjectURL (no dipendenze)
- Highlight: `highlightHtml()` split HTML per tag e applica `<mark>` solo su text nodes
- Cronologia: `useState(loadHistory)` con lazy initializer per evitare effect SSR warning
- Settings persistenti in `data/settings.json` con fallback a env vars — permette configurazione da UI senza modificare `.env.local`
- API key restituita mascherata dal GET settings (solo primi 4 e ultimi 4 caratteri), salvata in chiaro nel file
- Browse cartelle limitato alla root del progetto (no path traversal) — validazione con `path.resolve` + `startsWith`
- Modelli OpenRouter raggruppati free/paid con ordinamento (free prima) — endpoint `GET /api/settings/models` fa verifica chiave + recupero lista in un'unica chiamata
- README riscritto come guida utente con screenshot per ogni sezione — non più un semplice README tecnico
- Screenshot catturati con Playwright CLI (`playwright-cli screenshot`) in automatico, non manualmente
- Repo rinominato da `UpNote_Explorer` a `MySecondBrain` — aggiornati remote URL + riferimenti in README, page.tsx, STATO_PROGETTO

## Avvertenze tecniche

- ShadCN usa `@base-ui/react` (non Radix) — niente `asChild` su TooltipTrigger
- vis-network `smooth` richiede `{ enabled: true, type: "continuous", roundness: 0.5 }`
- Bug noto: `removeChild` DOM error alla chiusura di componenti base-ui — gestito con patch in `layout.tsx`
- Per push su GitHub usare SSH con deploy key:
  ```bash
  GIT_SSH_COMMAND="ssh -i /home/rosario/Documenti/Chiavi/deploy_key_github -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" git push origin main
  ```

## Prossimi passi

Aprire `MIGLIORAMENTI.md` e scegliere cosa implementare. Tutti i miglioramenti pianificati sono completati.
