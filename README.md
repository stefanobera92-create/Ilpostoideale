# Un posto ideale

Web app di ricerca immobili con slider, mappa e Safety Shield. I dati sono dimostrativi (Italia, Spagna, Albania, Grecia): non c’è scraping.

## Avvio

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Apri http://127.0.0.1:8000

`GET /api/search` restituisce solo id, coordinate e prezzo. `GET /api/properties/{id}` restituisce la scheda.
