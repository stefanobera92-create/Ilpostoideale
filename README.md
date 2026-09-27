# Un posto ideale

Cerchi una casa e vuoi vedere subito quali posti ci si avvicinano.

Imposti budget, distanza dal mare, metri quadri, paese e se ti interessa un’asta o una vendita. La mappa e la lista tengono solo ciò che rientra, ordinate dal più simile. Apri una scheda per leggere perché compare, gli avvisi e dove verificare i dati.

I numeri sono dimostrativi (Italia, Spagna, Albania, Grecia): non sono annunci veri e non arrivano da scraping. Una zona tratteggiata in mare è esclusa di proposito. Gli avvisi, sismici o di criminalità, non nascondono la casa: la fanno scendere in lista.

Apri l’app pubblicata: https://stefanobera92-create.github.io/Ilpostoideale/

## Sul computer

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Apri http://127.0.0.1:8000

`GET /api/search` restituisce la lista breve, già ordinata. `GET /api/properties/{id}` restituisce la scheda, con il perché del punteggio e la fonte da controllare.

```bash
python3 -m unittest discover -s tests
```
