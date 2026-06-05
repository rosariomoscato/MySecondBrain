# Miglioramenti — My Second Brain

Leggimi prima di ogni sessione per decidere cosa implementare.

---

## Grafica / UI

- [x] **Animazioni transizione** — fade-in/slide delle note nel grafo e nei risultati di ricerca (framer-motion)
- [x] **Grafo interattivo migliorato** — hover preview delle note (tooltip con abstract), raggruppamento visivo per categoria con cluster
- [x] **Layout note nel grafo** — mini-preview del contenuto dentro i nodi invece del solo titolo
- [x] **Tema animato** — particelle spaziali o stelle nel background (potenziare `space-background.tsx`)
- [x] **Empty state** — schermata iniziale più accattivante quando non c'è ricerca attiva
- [x] **Markdown rendering** — renderizzare markdown reale nel NoteSheet invece di testo piano

## Funzionalità

- [x] **Filtro per categoria** — sidebar cliccabile per filtrare il grafo e i risultati
- [x] **Breadcrumb di navigazione** — seguire i collegamenti tra note in modo visibile
- [x] **Note correlate** — suggerimento automatico di note simili nel NoteSheet (basato su link condivisi o similarità testo)
- [x] **Statistiche** — dashboard con conteggio note per categoria, note più collegate, timeline
- [x] **Export nota singola** — pulsante per scaricare una nota come PDF o markdown
- [x] **Full-text highlight** — evidenziare i termini cercati nel contenuto della nota aperta
- [x] **Keyboard shortcuts** — `/` per focus sulla search, `Esc` per chiudere sheet, `↑↓` per navigare risultati
- [x] **Cronologia ricerche** — salvare le ultime ricerche nel localStorage

## Generalizzazione

- [x] **Supporto qualsiasi cartella markdown** — percorso sorgente e pattern cartella configurabili via `notes.config.json` (rimosso hardcoded `UpNote_*`). Nome app configurabile via `NEXT_PUBLIC_APP_NAME` in `.env.local`. Override CLI: `--source`, `--pattern`, `--files-dir`

## AI / RAG

- [x] **Chat multi-turno** — mantenere il contesto della conversazione invece di una singola domanda
- [x] **Sorgenti espandibili** — cliccando su una fonte si espande una preview inline con categoria, snippet e pulsanti "Leggi tutto" / "Apri nel grafo" (focus + zoom sul nodo)
- [x] **Generazione riassunti** — bottone "Riassumi" nel NoteSheet che chiama l'AI per generare un riassunto conciso della nota, mostrato in card dedicata con streaming

## Impostazioni (Settings UI)

- [x] **Dialog Impostazioni** — icona ⚙️ nell'header che apre un dialog modale centrato con due tab: "Note" e "Intelligenza Artificiale"
- [x] **Configurazione cartella note da UI** — tab Note con campo percorso + pulsante "Sfoglia" che apre mini file-browser (partenza da root progetto, solo sottocartelle). Campo pattern. Pulsante "Salva e re-indicizza" → aggiorna `notes.config.json` + `data/settings.json` + lancia rebuild
- [x] **Configurazione AI da UI** — tab AI con campo API Key OpenRouter (password input con toggle visibilità), pulsante "Verifica chiave" → testa la chiave chiamando OpenRouter API, dropdown searchable con lista modelli (tutti con badge Free/Paid), pulsante "Salva"
- [x] **Persistenza settings** — nuovo file `data/settings.json` (gitignorato) con struttura `{ notes: { source, pattern, filesDir }, ai: { provider, openrouterApiKey, openrouterModel } }`. API route leggono da settings.json con fallback a env vars
- [x] **API settings** — `GET/PUT /api/settings` per leggere/salvare impostazioni, `GET /api/settings/models` per verificare chiave + lista modelli OpenRouter, `GET /api/settings/browse` per navigare cartelle server
- [x] **Integrazione API esistenti** — `ask/route.ts` e `summarize/route.ts` leggono modello/API key da settings.json. `rebuild/route.ts` legge source/pattern da settings
