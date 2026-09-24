# Un posto ideale

Apri l’app: https://stefanobera92-create.github.io/Ilpostoideale/

Web app di ricerca immobili con slider, mappa e Safety Shield. I dati sono dimostrativi (Italia, Spagna, Albania, Grecia): non c’è scraping. Su GitHub Pages parte da sola; il server Python qui sotto serve solo se vuoi eseguirla sul computer.

## Avvio

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Apri http://127.0.0.1:8000

`GET /api/search` restituisce solo id, coordinate e prezzo. `GET /api/properties/{id}` restituisce la scheda.
