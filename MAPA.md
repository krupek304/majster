# Mapa kodu — O!Majster

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

Store'y: `projekty` (+pole `status`, runda 5), `cennik`, `pozycje` (indeks
`projekt_id`, +pole `pomieszczenie`), `kategorie` (+pole `ukryta`),
`uzytkownicy`, `platnosci` (indeks `projekt_id`), `ustawienia` (jeden rekord
`id:'firma'` — dane do nagłówka wydruku). Dodanie pola `status` do projektów
(runda 5) NIE wymagało bumpa wersji bazy — IndexedDB nie wymusza schematu na
polach, tylko na store'ach/indeksach; stare projekty bez tego pola dostają
`'wycena'` domyślnie w UI (`statusProjektu()` w app.js).

`DOMYSLNY_CENNIK` — 60 gotowych pozycji cennika (14 kategorii = pełna kolejność
etapów wykończenia mieszkania), każda z jednostką i **sugerowaną stawką rynkową**
(Polska, średnia krajowa, sama robocizna — źródła i zakresy w PRZEKAZANIE.md).
49/60 ma stawkę >0, 11/60 (czynności organizacyjne) ma `stawka: 0`.

- `openDB()` — [db.js:96](js/db.js#L96) — otwiera/tworzy bazę, dopisuje nowe store'y przy uaktualnieniu
- `zapewnijDaneStartowe(db)` — [db.js:144](js/db.js#L144) — dopisuje brakujące domyślne kategorie (po nazwie) i pozycje cennika (po parze kategoria+nazwa) — addytywnie, nigdy nie nadpisuje ani nie duplikuje
- `cryptoId()` — [db.js:186](js/db.js#L186)
- Projekty: `pobierzProjekty` [214](js/db.js#L214), `dodajProjekt` [220](js/db.js#L220) (+`status:'wycena'`), `aktualizujProjekt(projekt)` [233](js/db.js#L233) (runda 5, np. zmiana statusu), `duplikujProjekt(projektId, nowaNazwa)` [240](js/db.js#L240) (runda 5 — kopiuje pozycje, NIE kopiuje płatności), `usunProjekt` [265](js/db.js#L265) (kasuje pozycje i płatności)
- Kategorie: `pobierzKategorie` [282](js/db.js#L282), `dodajKategorie` [288](js/db.js#L288), `aktualizujKategorie` [296](js/db.js#L296) (przełączanie `ukryta`), `usunKategorieRazemZCennikiem` [306](js/db.js#L306) (kasuje na stałe + jej pozycje cennika), `pobierzWszystkiePozycjeKosztorysu` [318](js/db.js#L318) (do liczenia ostrzeżeń przy usuwaniu)
- **Szablony pomieszczeń (runda 5)**: `SZABLONY_POMIESZCZEN` [328](js/db.js#L328) (4 gotowe zestawy: Łazienka/Kuchnia/Pokój-Salon/Przedpokój, odwołują się do NAZW pozycji cennika, nie ID), `pobierzNazwySzablonowPomieszczen` [361](js/db.js#L361), `pobierzPozycjeSzablonu(nazwa)` [367](js/db.js#L367) (pomija pozycję, jeśli usunięta z cennika), `dodajWielePozycjiKosztorysu(projektId, lista, pomieszczenie)` [378](js/db.js#L378) (bulk insert, ilość zawsze 1)
- **Kopia zapasowa (runda 5)**: `eksportujCalaBaze()` [406](js/db.js#L406) (wszystkie store'y → jeden JSON), `importujCalaBaze(kopia)` [415](js/db.js#L415) — **kategorie/cennik dopasowywane po nazwie i AKTUALIZOWANE** (nie duplikowane) na już zasianej instalacji, żeby przywracanie na nowym telefonie nie podwoiło 60 domyślnych pozycji; projekty/pozycje/płatności/ustawienia wprost po ID
- Cennik: `pobierzCennik` [473](js/db.js#L473), `dodajPozycjeCennika` [486](js/db.js#L486), `aktualizujPozycjeCennika` [499](js/db.js#L499), `usunPozycjeCennika` [504](js/db.js#L504)
- Pozycje kosztorysu: `pobierzPozycjeProjektu` [511](js/db.js#L511), `dodajPozycjeKosztorysu` [517](js/db.js#L517), `aktualizujPozycjeKosztorysu` [535](js/db.js#L535), `usunPozycjeKosztorysu` [540](js/db.js#L540)
- Płatności: `pobierzPlatnosciProjektu` [547](js/db.js#L547), `dodajPlatnosc` [553](js/db.js#L553), `usunPlatnosc` [566](js/db.js#L566)
- Ustawienia firmy: `pobierzDaneFirmy` [575](js/db.js#L575), `zapiszDaneFirmy` [581](js/db.js#L581)

## js/app.js — UI, renderowanie, obsługa zdarzeń

Stałe konfiguracyjne na górze pliku: `JEDNOSTKI`, `POMIESZCZENIA_PODPOWIEDZI`,
`IKONY_KATEGORII` + `ikonaKategorii(nazwa)` [49](js/app.js#L49), `PALETA_WYKRESU`,
`STATUSY` [57](js/app.js#L57) (runda 5: wycena/w_trakcie/zakonczony, kolory
do odznaki). `KLUCZ_OSTATNICH_ILOSCI` + `pobierzOstatniaIlosc`/`zapamietajIlosc`
[68](js/app.js#L68) — runda 5, localStorage (nie baza — to lokalna wygoda
urządzenia, nie dane biznesowe): zapamiętuje ostatnią ilość per pozycja cennika.

- `statusProjektu(projekt)` — [app.js:62](js/app.js#L62) — domyślnie `'wycena'` dla starych projektów bez pola `status`
- `kategorieWidoczne(kategorie, zachowajNazwe)` — [app.js:108](js/app.js#L108) — filtruje ukryte kategorie do dropdownów, nigdy nie chowa aktualnie wybranej
- `formatujStawke(stawka, jednostka)` — [app.js:112](js/app.js#L112) — "stawka nieustalona" zamiast "0,00 zł"
- `ustawWidok(widok, projektId?)` — [app.js:123](js/app.js#L123) — przełącza widok: projekty / kosztorys / cennik / ustawienia
- `renderProjekty()` — [app.js:142](js/app.js#L142) — v5: odznaka statusu na karcie projektu
- `dialogNowyProjekt()` — [app.js:173](js/app.js#L173)
- `renderKosztorys(projektId)` — [app.js:202](js/app.js#L202) — v5: +przełącznik statusu, przyciski "Typowy zestaw"/"Duplikuj"/"Udostępnij" (ten ostatni tylko gdy `navigator.share` dostępne)
- `htmlDrugiWymiar(p)` / `grupujPozycje` / `htmlPasekPodzialu` / `htmlPlatnosci` / `dialogPlatnosc` — [app.js:330-424](js/app.js#L330) — bez zmian względem poprzedniej rundy
- `dialogDuplikujProjekt(projekt)` — [app.js:602](js/app.js#L602) — runda 5, kopiuje projekt z pozycjami (nie płatności)
- `udostepnijKosztorys(projekt, pozycje, suma)` — [app.js:625](js/app.js#L625) — runda 5, `navigator.share()` z tekstowym podsumowaniem; `AbortError` (user anulował) wyciszony, inne błędy logowane
- `dialogSzablonPomieszczenia(projektId)` — [app.js:635](js/app.js#L635) — runda 5, checklist pozycji z wybranego szablonu (odznaczalne), dodaje zaznaczone hurtem z tagiem pomieszczenia
- `dialogPozycja(projektId, edytowanaPozycja?)` — [app.js:432](js/app.js#L432) — v5: wybór z cennika też przywraca zapamiętaną ilość (`pobierzOstatniaIlosc`); zapis pozycji zapamiętuje ilość (`zapamietajIlosc`) gdy wybrano z cennika
- `filtrujSelectCennik` / `htmlSelectCennik` — [app.js:546](js/app.js#L546) / [561](js/app.js#L561)
- `eksportujCSV(projekt, pozycje)` — [app.js:579](js/app.js#L579)
- `renderCennik()` / `renderListaCennika(filtr)` — [app.js:697](js/app.js#L697) / [713](js/app.js#L713)
- `dialogPozycjaCennika(edytowanaPozycja?)` — [app.js:747](js/app.js#L747)
- `renderUstawienia()` — [app.js:800](js/app.js#L800) — v5: +sekcja "Kopia zapasowa" (eksport/import całej bazy jako JSON)
- `otworzDialog(html)` / `zamknijDialog()` — [app.js:947](js/app.js#L947)
- `pokazOnboardingJesliPotrzebny()` — [app.js:962](js/app.js#L962) — runda 5, dialog powitalny raz na urządzenie (localStorage), wywołany po pierwszym `render()`
- `JEDNOSTKI`, `htmlSelectJednostka(id, wybrana)` — [app.js:93](js/app.js#L93)

## Auto-aktualizacja PWA (app.js, sekcja "Start")

Standalone PWA na iOS rzadko sama sprawdza aktualizacje po zmianie na
serwerze. Nasłuch na `navigator.serviceWorker.controllerchange` — gdy nowy
service worker przejmie kontrolę nad już otwartą stroną (realna aktualizacja,
odróżniona od pierwszej instalacji flagą `mielKontrolerNaStarcie`), strona
przeładowuje się **sama, raz**.

## Inne pliki

- [index.html](index.html) — szkielet strony, topbar + tabbar (3 zakładki: Projekty/Cennik/Ustawienia) + `<dialog>`
- [css/style.css](css/style.css) — style mobile-first; **tryb ciemny** przez `@media (prefers-color-scheme: dark)` na zmiennych CSS w `:root` (podąża za systemem telefonu, bez przełącznika w appce); sekcja `@media print` (widok do PDF, w tym `.naglowek-druku` ukryty na ekranie). Zawiera `[hidden] { display: none !important; }` (runda 5) — bez tego atrybut `hidden` na elemencie z klasą `.btn` nie działał, bo `.btn { display: inline-block }` ma taką samą specyficzność jak domyślne `[hidden]` przeglądarki i wygrywa jako reguła autorska (odkryte na przycisku "Udostępnij", który mimo `hidden=true` był widoczny).
- [sw.js](sw.js) — service worker, cache-first dla app shellu (offline)
- [manifest.webmanifest](manifest.webmanifest) — nazwa, ikony, `display: standalone`
- [.claude/launch.json](.claude/launch.json) — serwer deweloperski (`python -m http.server 5501`) do podglądu w Browser pane
