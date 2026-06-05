# Secondo Giro — Miglioramenti My Second Brain

Leggimi prima di ogni sessione per decidere cosa implementare.

---

## Estrazione contenuti

- [ ] **Link esterni dedicati** — estrarre URL `http(s)://` dal contenuto delle note e mostrarli in una sezione "Link esterni" nel NoteSheet (siti, video YouTube, PDF online, ecc.), con favicon o icona per tipo (video, sito, documento)
- [ ] **Embed video** — riconoscere URL YouTube/Vimeo nel contenuto e renderizzarli come embed player cliccabili o con thumbnail preview
- [ ] **Anteprima immagini nel contenuto** — gli allegati immagine vengono solo elencati come link; renderizzarli come anteprime inline nel contenuto markdown della nota

## Grafo

- [ ] **Nodi per link esterni** — mostrare nel grafo anche i link a siti/video come nodi di tipo diverso (es. quadrati grigi o icone distinte), per mappare visivamente le risorse esterne citate
- [ ] **Filtri avanzati nel grafo** — filtro per data, per numero di collegamenti, per note con/senza allegati

## Ricerca & AI

- [ ] **Ricerca per tag/keyword** — oltre alla categoria, supportare tag estratti dal frontmatter o dal contenuto delle note
- [ ] **Risposte AI con link esterni** — il prompt RAG include anche gli URL esterni estratti, arricchendo le risposte con riferimenti a fonti web
- [ ] **Ricerca semantica** — sostituire/affiancare fuse.js con embeddings (es. via API OpenRouter) per ricerca per significato, non solo per testo

## UX

- [ ] **Drag & drop note** — permettere di riordinare o raggruppare note nel grafo manualmente
- [ ] **Preferiti/bookmark** — segnare note preferite e filtrarle rapidamente
- [ ] **Modifica note** — permettere editing inline delle note con salvataggio sul file `.md` originale
- [ ] **Modalita offline/PWA** — trasformare l'app in PWA per uso offline dei propri appunti
