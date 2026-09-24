from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.data import detail, search

STATIC = Path(__file__).resolve().parent / "static"

app = FastAPI(title="Trova casa", version="0.1.0")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/search")
def search_properties(
    budget: int = Query(90000, ge=1000, le=500000),
    sea_km: float = Query(25, gt=0, le=200),
    min_sqm: int = Query(50, ge=10, le=500),
    type: str = Query("tutti", pattern="^(tutti|asta|mercato)$"),
) -> dict:
    """Risposta leggera: solo id, coordinate e prezzo. Niente schede."""
    return search(budget, sea_km, min_sqm, type)


@app.get("/api/properties/{property_id}")
def property_detail(
    property_id: str,
    budget: int = Query(90000, ge=1000, le=500000),
    sea_km: float = Query(25, gt=0, le=200),
    min_sqm: int = Query(50, ge=10, le=500),
) -> dict:
    row = detail(property_id, budget, sea_km, min_sqm)
    if row is None:
        raise HTTPException(status_code=404, detail="Immobile non disponibile")
    return row


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC / "index.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")
