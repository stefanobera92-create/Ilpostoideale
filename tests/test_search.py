import json
import unittest
from pathlib import Path

from app.data import (
    PROPERTIES,
    SEA_RANGE,
    _inside_exclusion,
    catalog,
    detail,
    reasons,
    search,
)

ROOT = Path(__file__).resolve().parents[1]


class SearchTests(unittest.TestCase):
    def test_hard_exclusion_never_appears(self):
        found = search(500000, 200, 10, "tutti", "tutti")
        ids = {point["id"] for point in found["points"]}
        self.assertNotIn("ex1", ids)
        self.assertNotIn("ex2", ids)
        self.assertGreaterEqual(found["excluded_hard"], 2)
        for point in found["points"]:
            self.assertFalse(_inside_exclusion(point["lon"], point["lat"]))

    def test_filters_and_country(self):
        found = search(50000, 30, 40, "asta", "Italia")
        self.assertGreater(found["count"], 0)
        for point in found["points"]:
            self.assertLessEqual(point["price"], 50000)
            self.assertLessEqual(point["sea_km"], 30)
            self.assertGreaterEqual(point["sqm"], 40)
            self.assertEqual(point["type"], "asta")
            self.assertEqual(point["country"], "Italia")

    def test_results_are_ranked_by_similarity(self):
        found = search(180000, 40, 50, "tutti", "tutti")
        scores = [point["match_score"] for point in found["points"]]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertIn(found["points"][0]["fit"], {"Ci somiglia molto", "Ci si avvicina", "Rientra nei criteri"})

    def test_inland_towns_are_not_on_the_beach(self):
        for row in PROPERTIES:
            if row["city"] not in SEA_RANGE:
                continue
            low, _span = SEA_RANGE[row["city"]]
            self.assertGreaterEqual(row["sea_km"], low)

    def test_detail_explains_the_match_and_hides_excluded(self):
        self.assertIsNone(detail("ex1", 90000, 25, 50))
        self.assertIsNone(detail("missing", 90000, 25, 50))
        card = detail("p2", 120000, 40, 40)
        self.assertIsNotNone(card)
        self.assertEqual(card["reasons"], reasons(
            next(row for row in PROPERTIES if row["id"] == "p2"),
            120000,
            40,
            40,
        ))
        self.assertIn("match_score", card)

    def test_copy_uses_italian_and_the_right_source(self):
        agrigento = next(row for row in PROPERTIES if row["city"] == "Agrigento")
        summary = detail(agrigento["id"], 220000, 80, 30)["summary"]
        self.assertIn("ad Agrigento", summary)
        self.assertNotIn("stato buono stato", summary)

        spain_sale = next(row for row in PROPERTIES if row["country"] == "Spagna" and row["type"] == "mercato")
        contact = detail(spain_sale["id"], 250000, 80, 30)["contact"]
        self.assertEqual(contact["office"], "Annuncio di mercato")
        self.assertEqual(contact["url"], "")

        italy_auction = next(row for row in PROPERTIES if row["country"] == "Italia" and row["type"] == "asta")
        auction = detail(italy_auction["id"], 250000, 80, 30)["contact"]
        self.assertEqual(auction["url"], "https://pvp.giustizia.it/")

    def test_published_pages_match_the_app(self):
        saved = json.loads((ROOT / "docs" / "data.json").read_text(encoding="utf-8"))
        self.assertEqual(saved, catalog())
        for name in ("app.js", "styles.css"):
            self.assertEqual(
                (ROOT / "docs" / name).read_text(encoding="utf-8"),
                (ROOT / "app" / "static" / name).read_text(encoding="utf-8"),
            )
        app_body = (ROOT / "app" / "static" / "index.html").read_text(encoding="utf-8").split("<body>", 1)[1]
        docs_body = (ROOT / "docs" / "index.html").read_text(encoding="utf-8").split("<body>", 1)[1]
        self.assertEqual(app_body.replace("/static/app.js", "app.js"), docs_body)
        self.assertIn('data-mode="static"', (ROOT / "docs" / "index.html").read_text(encoding="utf-8"))
        self.assertIn('data-mode="api"', (ROOT / "app" / "static" / "index.html").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
