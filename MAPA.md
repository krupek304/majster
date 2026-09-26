# Mapa kodu — Majster

Spis funkcji z numerami linii. Odświeżać po większych zmianach.

## js/calc.js — czysta logika obliczeniowa (bez DOM/DB, testowalna wprost node'm)

- `kwotaPozycji(ilosc, stawka)` — [calc.js:3](js/calc.js#L3) — ilość × stawka, zaokrąglone do grosza
- `sumyKategorii(pozycje)` — [calc.js:12](js/calc.js#L12) — suma kwot per kategoria, w kolejności pierwszego wystąpienia
- `sumaCalkowita(pozycje)` — [calc.js:27](js/calc.js#L27) — suma wszystkich pozycji
- `formatujKwote(kwota)` — [calc.js:31](js/calc.js#L31) — formatowanie na "1 234,56 zł"
- Testy: [calc.test.mjs](js/calc.test.mjs) — `node js/calc.test.mjs`

## js/db.js — warstwa danych, IndexedDB (`majster-db`, wersja 3)

Store'y: `projekty`, `cennik`, `pozycje` (indeks `projekt_id`), `kategorie`, `uzytkownicy`.
(`podkategorie` z wersji 2 zostało usunięte w v3 — połączone z `cennik`, patrz niżej.)
Pole `dodane_przez` w pozycji kosztorysu = zapas pod przyszłe konta (patrz PRZEKAZANIE.md).

`DOMYSLNY_CENNIK` — 60 gotowych pozycji cennika (14 kategorii = pełna kolejność
etapów wykończenia mieszkania), każda z jednostką i **sugerowaną stawką rynkową**
(Polska, średnia krajowa, sama robocizna — źródła i zakresy w PRZEKAZANIE.md).
49/60 ma stawkę >0, 11/60 (czynności organizacyjne: projekt, harmonogram, zakup
materiałów, zabezpieczenie, demontaż ogólny, wentylacja, wymiana okien, sprzątanie
zabezpieczeń, odbiór techniczny, dekory, smart home) ma `stawka: 0` — zbyt
zróżnicowane, żeby mieć jedną sensowną cenę, do wypełnienia przez fachowca.

- `openDB()` — [db.js:96](js/db.js#L96) — otwiera/tworzy bazę; przy uaktualnieniu do v3 kasuje store `podkategorie`
- `zapewnijDaneStartowe(db)` — [db.js:137](js/db.js#L137) — dopisuje brakujące domyślne kategorie (po nazwie) i pozycje cennika (po parze kategoria+nazwa) — addytywnie, nigdy nie nadpisuje ani nie duplikuje
- `cryptoId()` — [db.js:179](js/db.js#L179)
- Projekty: `pobierzProjekty` [207](js/db.js#L207), `dodajProjekt` [213](js/db.js#L213), `usunProjekt` [225](js/db.js#L225) (kasuje też jego pozycje)
- Kategorie: `pobierzKategorie` [236](js/db.js#L236), `dodajKategorie` [242](js/db.js#L242)
- Cennik (= domyślne stawki, edytowalne w ekranie „Cennik”): `pobierzCennik` [252](js/db.js#L252) (sortuje wg kolejności kategorii, potem alfabetycznie), `dodajPozycjeCennika` [265](js/db.js#L265), `aktualizujPozycjeCennika` [278](js/db.js#L278), `usunPozycjeCennika` [283](js/db.js#L283)
- Pozycje kosztorysu: `pobierzPozycjeProjektu` [290](js/db.js#L290), `dodajPozycjeKosztorysu` [296](js/db.js#L296), `aktualizujPozycjeKosztorysu` [313](js/db.js#L313), `usunPozycjeKosztorysu` [318](js/db.js#L318)

## js/app.js — UI, renderowanie, obsługa zdarzeń

- `ustawWidok(widok, projektId)` — [app.js:28](js/app.js#L28) — przełącza widok: projekty / kosztorys / cennik
- `renderProjekty()` — [app.js:47](js/app.js#L47) — lista projektów z sumą
- `dialogNowyProjekt()` — [app.js:77](js/app.js#L77)
- `renderKosztorys(projektId)` — [app.js:106](js/app.js#L106) — pozycje pogrupowane wg kategorii; stuknięcie wiersza = edycja, ikona 🗑 = usunięcie (osobny handler, `stopPropagation`)
- `formatujStawke(stawka, jednostka)` — [app.js:172](js/app.js#L172) — "stawka nieustalona" zamiast "0,00 zł", żeby nie wyglądało jak realna darmowa usługa
- `grupujPoKategorii(pozycje)` — [app.js:177](js/app.js#L177)
- `dialogPozycja(projektId, edytowanaPozycja?)` — [app.js:186](js/app.js#L186) — jeden formularz do dodawania I edycji pozycji kosztorysu; wybór z cennika (grupowany wg kategorii) autofilluje nazwę+kategorię+jednostkę+stawkę
- `htmlSelectCennik(id, kategorie, cennik)` — [app.js:279](js/app.js#L279) — `<select>` z `<optgroup>` per kategoria w kolejności etapów remontu (nie w kolejności ID w bazie)
- `eksportujCSV(projekt, pozycje)` — [app.js:297](js/app.js#L297)
- `renderCennik()` — [app.js:322](js/app.js#L322) — ekran "domyślne stawki"; stuknięcie wiersza = edycja stawki na stałe
- `dialogPozycjaCennika(edytowanaPozycja?)` — [app.js:360](js/app.js#L360) — jeden formularz do dodawania I edycji pozycji cennika
- `otworzDialog(html)` / `zamknijDialog()` — generyczny wrapper na `<dialog>`
- `JEDNOSTKI` — zamknięty zestaw jednostek (`szt., m2, mb, pkt, kpl., usł.`) używany w obu formularzach zamiast wolnego tekstu
- `htmlSelectJednostka(id, wybrana)` — `<select>` jednostki; jeśli istniejąca pozycja ma jednostkę spoza listy (starsze dane), dopisuje ją jako dodatkową opcję zamiast po cichu podmienić na "szt."

## Auto-aktualizacja PWA (app.js, sekcja "Start")

Standalone PWA na iOS rzadko sama sprawdza aktualizacje po zmianie na
serwerze — stąd zgłoszony przez użytkownika przypadek "otworzyłem stronę,
a cennika nie ma" (telefon pokazywał wersję sprzed dodania cennika).
Naprawione: nasłuch na `navigator.serviceWorker.controllerchange` —
gdy nowy service worker przejmie kontrolę nad już otwartą stroną (czyli
realna aktualizacja, nie pierwsza instalacja — rozróżnione flagą
`mielKontrolerNaStarcie`), strona przeładowuje się **sama, raz**. Dzięki
temu kolejne aktualizacje kodu dotrą do telefonu bez ręcznego usuwania
i dodawania ikony na nowo.

## Inne pliki

- [index.html](index.html) — szkielet strony, topbar + tabbar + `<dialog>`
- [css/style.css](css/style.css) — style mobile-first + sekcja `@media print` (widok do PDF)
- [sw.js](sw.js) — service worker, cache-first dla app shellu (offline)
- [manifest.webmanifest](manifest.webmanifest) — nazwa, ikony, `display: standalone`
- [.claude/launch.json](.claude/launch.json) — serwer deweloperski (`python -m http.server 5501`) do podglądu w Browser pane
