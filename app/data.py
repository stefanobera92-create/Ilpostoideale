"""Dati dimostrativi e filtri di ricerca.

Gli immobili e il poligono di esclusione sono di esempio: servono a far
funzionare la web app senza scraping e senza fonti esterne.
"""

from __future__ import annotations

import math

# Rettangolo in mare, a sud-est della Sicilia: non copre città reali.
EXCLUSION = [(16.6, 36.9), (18.4, 36.9), (18.4, 35.6), (16.6, 35.6)]

CITIES = [
    ("Palermo", "Italia", 38.12, 13.36),
    ("Catania", "Italia", 37.51, 15.08),
    ("Napoli", "Italia", 40.85, 14.27),
    ("Bari", "Italia", 41.12, 16.87),
    ("Cagliari", "Italia", 39.22, 9.12),
    ("Genova", "Italia", 44.41, 8.93),
    ("Lecce", "Italia", 40.35, 18.17),
    ("Reggio Calabria", "Italia", 38.11, 15.65),
    ("Sassari", "Italia", 40.73, 8.56),
    ("Matera", "Italia", 40.67, 16.60),
    ("Agrigento", "Italia", 37.31, 13.58),
    ("Salemi", "Italia", 37.82, 12.80),
    ("Gangi", "Italia", 37.80, 14.20),
    ("Sambuca di Sicilia", "Italia", 37.65, 13.11),
    ("Trieste", "Italia", 45.65, 13.78),
    ("Málaga", "Spagna", 36.72, -4.42),
    ("Almería", "Spagna", 36.84, -2.46),
    ("Valencia", "Spagna", 39.47, -0.38),
    ("Alicante", "Spagna", 38.35, -0.48),
    ("Cádiz", "Spagna", 36.53, -6.29),
    ("Granada", "Spagna", 37.18, -3.60),
    ("Vigo", "Spagna", 42.24, -8.72),
    ("Bilbao", "Spagna", 43.26, -2.93),
    ("Oviedo", "Spagna", 43.36, -5.84),
    ("Algeciras", "Spagna", 36.14, -5.45),
    ("Tirana", "Albania", 41.33, 19.82),
    ("Durazzo", "Albania", 41.32, 19.45),
    ("Valona", "Albania", 40.47, 19.49),
    ("Saranda", "Albania", 39.87, 20.00),
    ("Berat", "Albania", 40.70, 19.95),
    ("Scutari", "Albania", 42.07, 19.51),
    ("Atene", "Grecia", 37.98, 23.73),
    ("Salonicco", "Grecia", 40.64, 22.94),
    ("Patrasso", "Grecia", 38.25, 21.73),
    ("Candia", "Grecia", 35.34, 25.14),
    ("La Canea", "Grecia", 35.51, 24.02),
    ("Corfù", "Grecia", 39.62, 19.92),
    ("Kalamata", "Grecia", 37.04, 22.11),
    ("Ioannina", "Grecia", 39.67, 20.85),
]

# Distanza minima dal mare e variazione, in km. Le città interne non possono
# risultare in riva al mare solo perché il numero casuale è basso.
SEA_RANGE = {
    "Matera": (40, 25),
    "Salemi": (12, 16),
    "Gangi": (28, 20),
    "Sambuca di Sicilia": (18, 18),
    "Granada": (48, 25),
    "Oviedo": (22, 25),
    "Tirana": (27, 18),
    "Berat": (32, 20),
    "Scutari": (18, 16),
    "Ioannina": (55, 20),
}


def _hash(n: int) -> float:
    x = math.sin(n * 127.1) * 43758.5453
    return x - math.floor(x)


def _inside_exclusion(lon: float, lat: float) -> bool:
    polygon = EXCLUSION
    inside = False
    j = len(polygon) - 1
    for i in range(len(polygon)):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def _sea_km(city: str, roll: float) -> float:
    low, span = SEA_RANGE.get(city, (0.4, 28.0))
    return round(low + roll * span, 1)


def _build() -> list[dict]:
    rows: list[dict] = []
    seq = 1
    for ci, (city, country, lat, lon) in enumerate(CITIES):
        copies = 2 + (ci % 3)
        for k in range(copies):
            r1 = _hash(ci * 10 + k + 1)
            r2 = _hash(ci * 10 + k + 2)
            r3 = _hash(ci * 10 + k + 3)
            r4 = _hash(ci * 10 + k + 4)
            auction = r1 > 0.45
            price = (8000 + r2 * 70000) if auction else (45000 + r2 * 160000)
            price = int(round(price / 1000.0) * 1000)
            alerts: list[str] = []
            if country == "Italia" and lat < 40.2 and r1 > 0.55:
                alerts.append("Rischio sismico elevato")
            if r2 > 0.82:
                alerts.append("Criminalità sopra la media")
            rows.append(
                {
                    "id": f"p{seq}",
                    "city": city,
                    "country": country,
                    "lat": round(lat + (r3 - 0.5) * 0.35, 5),
                    "lon": round(lon + (r4 - 0.5) * 0.45, 5),
                    "price": price,
                    "sqm": 35 + round(r3 * 28) * 5,
                    "sea_km": _sea_km(city, r4),
                    "type": "asta" if auction else "mercato",
                    "alerts": alerts,
                    "excluded": False,
                }
            )
            seq += 1
    rows.append(
        {
            "id": "ex1",
            "city": "Esempio escluso",
            "country": "—",
            "lat": 36.3,
            "lon": 17.2,
            "price": 20000,
            "sqm": 80,
            "sea_km": 5,
            "type": "asta",
            "alerts": [],
            "excluded": True,
        }
    )
    rows.append(
        {
            "id": "ex2",
            "city": "Esempio escluso",
            "country": "—",
            "lat": 36.0,
            "lon": 17.8,
            "price": 35000,
            "sqm": 60,
            "sea_km": 8,
            "type": "mercato",
            "alerts": [],
            "excluded": True,
        }
    )
    return rows


def _condition(row: dict) -> str:
    if row["type"] == "asta" and row["sqm"] < 80:
        return "Da ristrutturare"
    if row["sea_km"] < 8 and row["price"] > 120000:
        return "Buono stato"
    return "Abitabile"


def _rooms(row: dict) -> int:
    return max(1, min(5, round(row["sqm"] / 35)))


def _in_city(city: str) -> str:
    first = city[0].lower()
    if first in "aeiouàáèéìíòóùú":
        return f"ad {city}"
    return f"a {city}"


def _condition_phrase(condition: str) -> str:
    if condition == "Da ristrutturare":
        return "da ristrutturare"
    if condition == "Buono stato":
        return "in buono stato"
    return "abitabile"


def km(value: float) -> str:
    number = float(value)
    if abs(number - round(number)) < 0.05:
        return str(int(round(number)))
    return f"{number:.1f}".replace(".", ",")


def euro(amount: int) -> str:
    return "€ " + f"{int(amount):,}".replace(",", ".")


def _summary(row: dict) -> str:
    kind = "un'asta giudiziaria" if row["type"] == "asta" else "una casa in vendita"
    state = _condition_phrase(_condition(row))
    return (
        f"Esempio di {kind} {_in_city(row['city'])}. "
        f"{row['sqm']} m², {state}, a circa {km(row['sea_km'])} km dal mare. "
        "I numeri sono dimostrativi: controlla prezzo e documenti sulla fonte ufficiale prima di un contatto."
    )


def contact_for(row: dict) -> dict:
    country = row["country"]
    auction = row["type"] == "asta"
    if country == "Italia" and auction:
        return {
            "office": "Portale Vendite Pubbliche",
            "url": "https://pvp.giustizia.it/",
            "phone": None,
            "where": "Nella scheda dell'asta trovi tribunale, custode giudiziario e il numero da chiamare.",
        }
    if country == "Italia" and row["price"] <= 20000:
        return {
            "office": f"Comune di {row['city']}",
            "url": "",
            "phone": None,
            "where": "Per una casa a prezzo simbolico chiedi all'ufficio tecnico del comune. Il centralino aggiornato è sul sito comunale.",
        }
    if country == "Italia":
        return {
            "office": "Annuncio di mercato",
            "url": "",
            "phone": None,
            "where": "Scheda dimostrativa. Un annuncio reale indica l'agenzia o il privato: verifica identità, visura e prezzo prima di qualsiasi pagamento.",
        }
    if country == "Spagna" and auction:
        return {
            "office": "Portal de Subastas del BOE",
            "url": "https://subastas.boe.es/",
            "phone": None,
            "where": "Apri l'asta sul BOE: lì compaiono il lotto, il tribunale e i recapiti della procedura.",
        }
    if country == "Spagna":
        return {
            "office": "Annuncio di mercato",
            "url": "",
            "phone": None,
            "where": "Scheda dimostrativa. Le aste pubbliche spagnole stanno sul Portal de Subastas del BOE; una vendita indica invece l'agenzia.",
        }
    if country == "Grecia" and auction:
        return {
            "office": "e-Auction",
            "url": "https://www.eauction.gr/",
            "phone": None,
            "where": "Le aste elettroniche greche pubblicano sul portale i documenti e il modo per presentare un'offerta.",
        }
    if country == "Grecia":
        return {
            "office": "Annuncio di mercato",
            "url": "",
            "phone": None,
            "where": "Scheda dimostrativa. e-Auction vale per le aste; una vendita reale indica l'agenzia nell'annuncio.",
        }
    if country == "Albania":
        return {
            "office": "e-Albania",
            "url": "https://e-albania.al/",
            "phone": None,
            "where": "Per un immobile specifico chiedi al comune o allo sportello indicato sul servizio pubblico e-Albania.",
        }
    return {
        "office": "Fonte non disponibile",
        "url": "",
        "phone": None,
        "where": "Scheda dimostrativa, senza un recapito reale.",
    }


def match_score(row: dict, budget: int, sea_km: float, min_sqm: int) -> int:
    score = 62.0
    score += max(0.0, (budget - row["price"]) / budget) * 22
    score += max(0.0, (sea_km - row["sea_km"]) / sea_km) * 10
    score += min(12.0, (row["sqm"] - min_sqm) / 8)
    score -= len(row["alerts"]) * 8
    # Stesso arrotondamento di Math.round nel browser: .5 va verso l'alto.
    return max(35, min(98, math.floor(score + 0.5)))


def fit_label(score: int) -> str:
    if score >= 85:
        return "Ci somiglia molto"
    if score >= 70:
        return "Ci si avvicina"
    return "Rientra nei criteri"


def reasons(row: dict, budget: int, sea_km: float, min_sqm: int) -> list[str]:
    lines = []
    margin = budget - row["price"]
    if margin >= 20000:
        lines.append(f"Costa {euro(margin)} in meno del massimo che hai indicato.")
    else:
        lines.append("Resta nel budget, vicino al massimo.")
    if row["sea_km"] <= 5:
        lines.append(f"Il mare è a {km(row['sea_km'])} km: ci arrivi in pochi minuti.")
    elif sea_km - row["sea_km"] >= 10:
        lines.append(f"Il mare è a {km(row['sea_km'])} km, più vicino del limite di {km(sea_km)} km.")
    else:
        lines.append(f"Il mare è a {km(row['sea_km'])} km, dentro i {km(sea_km)} km scelti.")
    extra = row["sqm"] - min_sqm
    if extra >= 30:
        lines.append(f"{row['sqm']} m², ben oltre i {min_sqm} m² minimi.")
    else:
        lines.append(f"{row['sqm']} m², in linea con i {min_sqm} m² che cerchi.")
    if row["alerts"]:
        lines.append("Ci sono avvisi da leggere prima di considerarlo il posto giusto.")
    else:
        lines.append("In questa scheda non compare nessun avviso di rischio.")
    return lines


def public_row(row: dict, budget: int | None = None, sea_km: float | None = None, min_sqm: int | None = None) -> dict:
    payload = {
        "id": row["id"],
        "city": row["city"],
        "country": row["country"],
        "lat": row["lat"],
        "lon": row["lon"],
        "price": row["price"],
        "sqm": row["sqm"],
        "sea_km": row["sea_km"],
        "rooms": _rooms(row),
        "condition": _condition(row),
        "summary": _summary(row),
        "type": row["type"],
        "alerts": row["alerts"],
        "contact": contact_for(row),
    }
    if budget is not None and sea_km is not None and min_sqm is not None:
        score = match_score(row, budget, sea_km, min_sqm)
        payload["match_score"] = score
        payload["fit"] = fit_label(score)
        payload["reasons"] = reasons(row, budget, sea_km, min_sqm)
    return payload


PROPERTIES = _build()
BY_ID = {row["id"]: row for row in PROPERTIES}


def _passes(row: dict, budget: int, sea_km: float, min_sqm: int, listing_type: str, country: str) -> bool:
    if row["excluded"] or _inside_exclusion(row["lon"], row["lat"]):
        return False
    if row["price"] > budget or row["sea_km"] > sea_km or row["sqm"] < min_sqm:
        return False
    if listing_type != "tutti" and row["type"] != listing_type:
        return False
    if country != "tutti" and row["country"] != country:
        return False
    return True


def search(budget: int, sea_km: float, min_sqm: int, listing_type: str, country: str = "tutti") -> dict:
    points = []
    excluded = 0
    for row in PROPERTIES:
        if row["excluded"] or _inside_exclusion(row["lon"], row["lat"]):
            excluded += 1
            continue
        if not _passes(row, budget, sea_km, min_sqm, listing_type, country):
            continue
        score = match_score(row, budget, sea_km, min_sqm)
        points.append(
            {
                "id": row["id"],
                "city": row["city"],
                "country": row["country"],
                "lat": row["lat"],
                "lon": row["lon"],
                "price": row["price"],
                "sqm": row["sqm"],
                "sea_km": row["sea_km"],
                "rooms": _rooms(row),
                "condition": _condition(row),
                "type": row["type"],
                "has_alert": bool(row["alerts"]),
                "match_score": score,
                "fit": fit_label(score),
            }
        )
    points.sort(key=lambda item: (-item["match_score"], item["price"], item["id"]))
    return {"count": len(points), "excluded_hard": excluded, "points": points}


def detail(property_id: str, budget: int, sea_km: float, min_sqm: int) -> dict | None:
    row = BY_ID.get(property_id)
    if row is None or row["excluded"] or _inside_exclusion(row["lon"], row["lat"]):
        return None
    return public_row(row, budget, sea_km, min_sqm)


def catalog() -> list[dict]:
    """Schede pubblicabili, senza punteggio: il punteggio dipende dai criteri."""
    rows = []
    for row in PROPERTIES:
        if row["excluded"] or _inside_exclusion(row["lon"], row["lat"]):
            continue
        rows.append(public_row(row))
    return rows
