# Mapa kodu — Majster

Spis funkcji z numerami linii. Odświeżać po większych zmianach.

## js/calc.js — czysta logika obliczeniowa (bez DOM/DB, testowalna wprost node'm)

- `kwotaPozycji(ilosc, stawka)` — [calc.js:3](js/calc.js#L3) — ilość × stawka, zaokrąglone do grosza
- `sumyPolem(pozycje, pole, domyslnaEtykieta)` — [calc.js:13](js/calc.js#L13) — generyczne grupowanie+sumowanie wg dowolnego pola (kategoria, pomieszczenie, ...)
- `sumyKategorii(pozycje)` — [calc.js:30](js/calc.js#L30) — wrapper `sumyPolem` na `kategoria`
- `sumyPomieszczen(pozycje)` — [calc.js:35](js/calc.js#L35) — wrapper `sumyPolem` na `pomieszczenie`
- `sumaCalkowita(pozycje)` — [calc.js:39](js/calc.js#L39)
- `sumaPlatnosci(platnosci)` — [calc.js:43](js/calc.js#L43)
- `formatujKwote(kwota)` — [calc.js:47](js/calc.js#L47) — formatowanie na "1 234,56 zł"
- Testy: [calc.test.mjs](js/calc.test.mjs) — `node js/calc.test.mjs` (16 asercji)

## js/db.js — warstwa danych, IndexedDB (`majster-db`, wersja 4)

Store'y: `projekty`, `cennik`, `pozycje` (indeks `projekt_id`), `kategorie`,
`uzytkownicy`, `platnosci` (indeks `projekt_id`, nowość v4), `ustawienia`
(nowość v4 — jeden rekord `id:'firma'` z danymi do nagłówka wydruku).

`DOMYSLNY_CENNIK` — 60 gotowych pozycji cennika (14 kategorii = pełna kolejność
etapów wykończenia mieszkania), każda z jednostką i **sugerowaną stawką rynkową**
(Polska, średnia krajowa, sama robocizna — źródła i zakresy w PRZEKAZANIE.md).
49/60 ma stawkę >0, 11/60 (czynności organizacyjne) ma `stawka: 0` — do wypełnienia
przez fachowca.

- `openDB()` — [db.js:96](js/db.js#L96) — otwiera/tworzy bazę, dopisuje nowe store'y przy uaktualnieniu
- `zapewnijDaneStartowe(db)` — [db.js:144](js/db.js#L144) — dopisuje brakujące domyślne kategorie (po nazwie) i pozycje cennika (po parze kategoria+nazwa) — addytywnie, nigdy nie nadpisuje ani nie duplikuje
- `cryptoId()` — [db.js:186](js/db.js#L186)
- Projekty: `pobierzProjekty` [214](js/db.js#L214), `dodajProjekt` [220](js/db.js#L220), `usunProjekt` [232](js/db.js#L232) (kasuje też jego pozycje — **nie** kasuje płatności, patrz "Co zostaje otwarte")
- Kategorie: `pobierzKategorie` [243](js/db.js#L243), `dodajKategorie` [249](js/db.js#L249) (nowe pole `ukryta: false`), `aktualizujKategorie` [257](js/db.js#L257) (v4, do przełączania `ukryta`)
- Cennik (= domyślne stawki, edytowalne w ekranie „Cennik”): `pobierzCennik` [264](js/db.js#L264) (sortuje wg kolejności kategorii, potem alfabetycznie), `dodajPozycjeCennika` [277](js/db.js#L277), `aktualizujPozycjeCennika` [290](js/db.js#L290), `usunPozycjeCennika` [295](js/db.js#L295)
- Pozycje kosztorysu: `pobierzPozycjeProjektu` [302](js/db.js#L302), `dodajPozycjeKosztorysu` [308](js/db.js#L308) (v4: +pole `pomieszczenie`), `aktualizujPozycjeKosztorysu` [326](js/db.js#L326), `usunPozycjeKosztorysu` [331](js/db.js#L331)
- Płatności (v4): `pobierzPlatnosciProjektu` [338](js/db.js#L338), `dodajPlatnosc` [344](js/db.js#L344), `usunPlatnosc` [357](js/db.js#L357)
- Ustawienia firmy (v4): `pobierzDaneFirmy` [366](js/db.js#L366) (zwraca puste stringi, gdy nic nie zapisano), `zapiszDaneFirmy` [372](js/db.js#L372)

## js/app.js — UI, renderowanie, obsługa zdarzeń

Stałe konfiguracyjne na górze pliku: `JEDNOSTKI` (6 jednostek do dropdowna),
`POMIESZCZENIA_PODPOWIEDZI` (datalist, pole zostaje wolnym tekstem),
`IKONY_KATEGORII` + `ikonaKategorii(nazwa)` [46](js/app.js#L46) (fallback 📁
dla własnych kategorii), `PALETA_WYKRESU` (kolory paska podziału kosztów).

- `kategorieWidoczne(kategorie, zachowajNazwe)` — [app.js:74](js/app.js#L74) — filtruje ukryte kategorie do dropdownów wyboru, ale nigdy nie chowa aktualnie wybranej (edycja nie "gubi" kategorii po cichu)
- `formatujStawke(stawka, jednostka)` — [app.js:78](js/app.js#L78) — "stawka nieustalona" zamiast "0,00 zł"
- `ustawWidok(widok, projektId?)` — [app.js:89](js/app.js#L89) — przełącza widok: projekty / kosztorys / cennik / **ustawienia** (v4, nowa zakładka)
- `renderProjekty()` — [app.js:108](js/app.js#L108)
- `dialogNowyProjekt()` — [app.js:138](js/app.js#L138)
- `renderKosztorys(projektId)` — [app.js:167](js/app.js#L167) — pozycje pogrupowane wg kategorii **lub pomieszczenia** (przełącznik), nagłówek do druku, pasek podziału kosztów, sekcja płatności
- `htmlDrugiWymiar(p)` — [app.js:274](js/app.js#L274) — w wierszu pozycji pokazuje "drugi" wymiar (pomieszczenie gdy grupujemy wg kategorii, i odwrotnie)
- `grupujPozycje(pozycje, pole, domyslnaEtykieta)` — [app.js:281](js/app.js#L281) — generyczne grupowanie do UI (na bazie `sumyPolem`)
- `htmlPasekPodzialu(pozycje)` — [app.js:292](js/app.js#L292) — pasek + legenda, zawsze wg kategorii niezależnie od przełącznika listy; znika przy <2 kategoriach
- `htmlPlatnosci(platnosci, suma)` / `dialogPlatnosc(projektId)` — [app.js:317](js/app.js#L317) / [341](js/app.js#L341) — zapłacono/pozostało + lista wpłat
- `dialogPozycja(projektId, edytowanaPozycja?)` — [app.js:376](js/app.js#L376) — dodawanie/edycja pozycji: wybór z cennika (z wyszukiwarką `filtrujSelectCennik`), pole Pomieszczenie (datalist), Jednostka (dropdown)
- `filtrujSelectCennik(input, select)` — [app.js:485](js/app.js#L485) — chowa niepasujące `<option>`/`<optgroup>` zamiast przebudowywać select
- `htmlSelectCennik(id, kategorie, cennik)` — [app.js:500](js/app.js#L500) — `<select>` z `<optgroup>` per kategoria (z ikoną), w kolejności etapów remontu
- `eksportujCSV(projekt, pozycje)` — [app.js:518](js/app.js#L518) — v4: +kolumna Pomieszczenie
- `renderCennik()` / `renderListaCennika(filtr)` — [app.js:545](js/app.js#L545) / [561](js/app.js#L561) — ekran "domyślne stawki" z wyszukiwarką na żywo (filtruje `cennikPamiec`, bez ponownego zapytania do bazy)
- `dialogPozycjaCennika(edytowanaPozycja?)` — [app.js:595](js/app.js#L595)
- `renderUstawienia()` — [app.js:648](js/app.js#L648) — v4, nowy ekran: dane firmy (nagłówek wydruku) + zarządzanie kategoriami (ukryj/pokaż, dodaj nową)
- `otworzDialog(html)` / `zamknijDialog()` — [app.js:720](js/app.js#L720) — generyczny wrapper na `<dialog>`
- `JEDNOSTKI`, `htmlSelectJednostka(id, wybrana)` — [app.js:59](js/app.js#L59) — `<select>` jednostki; jeśli istniejąca pozycja ma jednostkę spoza listy, dopisuje ją jako dodatkową opcję zamiast po cichu podmienić

## Auto-aktualizacja PWA (app.js, sekcja "Start")

Standalone PWA na iOS rzadko sama sprawdza aktualizacje po zmianie na
serwerze. Nasłuch na `navigator.serviceWorker.controllerchange` — gdy nowy
service worker przejmie kontrolę nad już otwartą stroną (realna aktualizacja,
odróżniona od pierwszej instalacji flagą `mielKontrolerNaStarcie`), strona
przeładowuje się **sama, raz**.

## Inne pliki

- [index.html](index.html) — szkielet strony, topbar + tabbar (3 zakładki: Projekty/Cennik/Ustawienia) + `<dialog>`
- [css/style.css](css/style.css) — style mobile-first; **tryb ciemny** przez `@media (prefers-color-scheme: dark)` na zmiennych CSS w `:root` (podąża za systemem telefonu, bez przełącznika w appce); sekcja `@media print` (widok do PDF, w tym `.naglowek-druku` ukryty na ekranie)
- [sw.js](sw.js) — service worker, cache-first dla app shellu (offline)
- [manifest.webmanifest](manifest.webmanifest) — nazwa, ikony, `display: standalone`
- [.claude/launch.json](.claude/launch.json) — serwer deweloperski (`python -m http.server 5501`) do podglądu w Browser pane
