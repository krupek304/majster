# Mapa kodu — Majster

Spis funkcji z numerami linii. Odświeżać po większych zmianach.

## js/calc.js — czysta logika obliczeniowa (bez DOM/DB, testowalna wprost node'm)

- `kwotaPozycji(ilosc, stawka)` — [calc.js:3](js/calc.js#L3) — ilość × stawka, zaokrąglone do grosza
- `sumyKategorii(pozycje)` — [calc.js:12](js/calc.js#L12) — suma kwot per kategoria, w kolejności pierwszego wystąpienia
- `sumaCalkowita(pozycje)` — [calc.js:27](js/calc.js#L27) — suma wszystkich pozycji
- `formatujKwote(kwota)` — [calc.js:31](js/calc.js#L31) — formatowanie na "1 234,56 zł"
- Testy: [calc.test.mjs](js/calc.test.mjs) — `node js/calc.test.mjs`

## js/db.js — warstwa danych, IndexedDB (`majster-db`)

Store'y: `projekty`, `cennik`, `pozycje` (indeks `projekt_id`), `kategorie`, `uzytkownicy`.
Pole `dodane_przez` w pozycji kosztorysu = zapas pod przyszłe konta (patrz PRZEKAZANIE.md).

- `openDB()` — [db.js:26](js/db.js#L26) — otwiera/tworzy bazę, seeduje kategorie i domyślnego użytkownika
- `cryptoId()` — [db.js:80](js/db.js#L80)
- Projekty: `pobierzProjekty` [108](js/db.js#L108), `dodajProjekt` [114](js/db.js#L114), `usunProjekt` [126](js/db.js#L126) (kasuje też jego pozycje)
- Kategorie: `pobierzKategorie` [137](js/db.js#L137), `dodajKategorie` [143](js/db.js#L143)
- Cennik: `pobierzCennik` [153](js/db.js#L153), `dodajPozycjeCennika` [159](js/db.js#L159), `aktualizujPozycjeCennika` [172](js/db.js#L172), `usunPozycjeCennika` [177](js/db.js#L177)
- Pozycje kosztorysu: `pobierzPozycjeProjektu` [184](js/db.js#L184), `dodajPozycjeKosztorysu` [190](js/db.js#L190), `aktualizujPozycjeKosztorysu` [207](js/db.js#L207), `usunPozycjeKosztorysu` [212](js/db.js#L212)

## js/app.js — UI, renderowanie, obsługa zdarzeń

- `ustawWidok(widok, projektId)` — [app.js:28](js/app.js#L28) — przełącza widok: projekty / kosztorys / cennik
- `renderProjekty()` — [app.js:47](js/app.js#L47) — lista projektów z sumą
- `dialogNowyProjekt()` — [app.js:77](js/app.js#L77)
- `renderKosztorys(projektId)` — [app.js:106](js/app.js#L106) — pozycje pogrupowane wg kategorii + podsumowanie + przyciski eksportu
- `grupujPoKategorii(pozycje)` — [app.js:166](js/app.js#L166)
- `dialogNowaPozycja(projektId)` — [app.js:175](js/app.js#L175) — formularz pozycji, wybór z cennika lub ręcznie, podgląd kwoty na żywo
- `eksportujCSV(projekt, pozycje)` — [app.js:262](js/app.js#L262)
- `renderCennik()` — [app.js:287](js/app.js#L287)
- `dialogNowaPozycjaCennika()` — [app.js:317](js/app.js#L317)
- `otworzDialog(html)` / `zamknijDialog()` — [app.js:361](js/app.js#L361) / [app.js:365](js/app.js#L365) — generyczny wrapper na `<dialog>`

## Inne pliki

- [index.html](index.html) — szkielet strony, topbar + tabbar + `<dialog>`
- [css/style.css](css/style.css) — style mobile-first + sekcja `@media print` (widok do PDF)
- [sw.js](sw.js) — service worker, cache-first dla app shellu (offline)
- [manifest.webmanifest](manifest.webmanifest) — nazwa, ikony, `display: standalone`
- [.claude/launch.json](.claude/launch.json) — serwer deweloperski (`python -m http.server 5501`) do podglądu w Browser pane
