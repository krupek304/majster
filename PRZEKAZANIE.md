# Przekazanie — O!Majster

**Nazwa appki zmieniona z "Majster" na "O!Majster" (2026-09-26, na życzenie
użytkownika)** — widoczne w tytule strony, nagłówku, ikonie na ekranie
głównym. Techniczne identyfikatory (nazwa bazy IndexedDB `majster-db`,
zmienne, nazwy funkcji) zostały bez zmian — zmiana nazwy nie kasuje ani nie
migruje żadnych danych, to czysto kosmetyczna zmiana brandingu.

## Stan projektu

Działający MVP: aplikacja PWA do budowania kosztorysu prac remontowych
(pozycje ilość × stawka, kategorie, cennik wielokrotnego użytku, suma
całkowita, eksport CSV, wydruk/PDF przez przeglądarkę). Zero backendu,
zero kosztów, wszystko lokalnie w IndexedDB na urządzeniu.

**Wdrożona i działająca pod adresem: https://krupek304.github.io/o-majster/**
(GitHub Pages, repozytorium publiczne `krupek304/o-majster` — przemianowane
2026-09-26 z `majster` na życzenie użytkownika, branch `main`, HTTPS
wymuszony przez GitHub). To jest adres do otwarcia na iPhonie i dodania do
ekranu głównego (Safari → Udostępnij → Dodaj do ekranu głównego).

**Stary adres `https://krupek304.github.io/majster/` już NIE działa** —
sprawdzone bezpośrednio: zwraca 404 "Site not found", GitHub Pages nie
przekierowuje automatycznie starych ścieżek po rename repozytorium (inaczej
niż `git clone`/`git push` na stary URL, które nadal działają dzięki
przekierowaniu na poziomie samego repo — to dotyczy tylko operacji git,
nie stron Pages). Każdy, kto miał stary link zapisany (w tym ikona na
ekranie głównym telefonu), musi przejść na nowy adres i dodać go od nowa.

## Model danych (patrz MAPA.md → js/db.js)

- **Projekt** = jedno zlecenie/mieszkanie, ma własną listę pozycji.
- **Pozycja kosztorysu** = nazwa + kategoria + ilość + jednostka + stawka
  → kwota = ilość × stawka. Edytowalna po zapisaniu (stuknięcie wiersza).
- **Cennik = domyślne stawki** (jeden system, nie dwa równoległe — decyzja
  z 2026-09-26). 60 gotowych pozycji, każda z jednostką i **sugerowaną
  stawką rynkową** znalezioną w internecie (patrz sekcja niżej), plus
  dowolna liczba własnych. Wybór z cennika przy dodawaniu pozycji
  auto-wypełnia nazwę+kategorię+jednostkę+stawkę — wszystko wciąż
  edytowalne przed zapisem. Cennik sam w sobie też jest edytowalny
  (ekran "Cennik", stuknięcie wiersza) — to jest "opcja ustawienia
  stawek domyślnych", o którą prosił użytkownik.
- **Kategorie** = 14 domyślnych, w pełnej kolejności etapów wykończenia
  mieszkania (od "Przygotowanie i planowanie" po "Prace dodatkowe i
  opcjonalne"), edytowalne. Lista podana przez użytkownika 2026-09-26.
- Pole `dodane_przez` w każdej pozycji = ID użytkownika (dziś zawsze `"ja"`,
  jeden zaszyty rekord w store `uzytkownicy`). To jest **jedyny** element
  pod przyszłe konta — zgodnie z ustaleniem, że teraz jest jeden użytkownik,
  ale architektura ma nie blokować dodania kolejnych kont później. Żadnego
  logowania/UI multi-user nie zbudowano teraz celowo (nie było potrzebne).
- **Pomieszczenie** (2026-09-26, runda 4) — drugi, niezależny wymiar na
  pozycji kosztorysu (wolny tekst + podpowiedzi: Kuchnia, Łazienka, Salon...).
  Lista da się grupować wg kategorii ALBO wg pomieszczenia (przełącznik na
  ekranie kosztorysu) — pokazuje ile kosztowała konkretna łazienka, nie
  tylko konkretny etap prac w całym mieszkaniu.
- **Kategoria.ukryta** (runda 4) — kategorie można ukryć (znikają z
  dropdownów wyboru), nie tylko dodawać. Nic nie usuwa danych — pozycje,
  które już mają ukrytą kategorię, nadal ją poprawnie pokazują.
- **Płatności** (runda 4, nowy store) — wpłaty klienta (kwota, data, opis)
  przypisane do projektu; "Zapłacono" / "Pozostało" liczone automatycznie.
  Kasowane razem z projektem (`usunProjekt` czyści też jego płatności).
- **Ustawienia firmy** (runda 4, nowy store, jeden rekord) — nazwa/telefon/
  e-mail używane w nagłówku wydruku/PDF. Nowa 3. zakładka "Ustawienia" —
  tam też zarządzanie kategoriami (ukryj/pokaż/dodaj nową — to jest UI,
  którego brakowało do istniejącej wcześniej funkcji `dodajKategorie`).

### Historia: podkategorie → scalone z cennikiem (2026-09-26)

Pierwsza wersja tej funkcji (patrz commit `a555538`) dodała osobny store
`podkategorie` (nazwa+kategoria, bez jednostki/stawki) jako "podpowiedzi".
Po teście użytkownik zauważył, że np. malowanie i tak pokazywało jednostkę
"szt." zamiast "m2" — bo podkategoria nie niosła jednostki. Rozwiązanie:
**połączyć podkategorie z cennikiem** w jeden system (decyzja użytkownika,
zaproponowana przeze mnie jako prostsza) — każda z 60 typowych czynności
jest teraz od razu gotową pozycją cennika z poprawną jednostką i sugerowaną
stawką. Store `podkategorie` usunięty w migracji do wersji bazy 3.

## Decyzje z researchu (patrz doc "Majster — Research rynku")

- Platforma: **PWA** (Progressive Web App), nie natywna appka — jedyna
  droga na iPhone spełniająca "zero kosztów, zero cotygodniowej pracy"
  (natywny sideload z darmowym Apple ID wymaga re-podpisywania co 7 dni).
- Struktura pozycji: **ilość × stawka za jednostkę** (nie ryczałt).
- Wiele niezależnych projektów/kosztorysów — nie jeden na raz.
- Własny edytowalny cennik stawek.

## Sugerowane stawki rynkowe (2026-09-26) — źródła i metodologia

Na prośbę użytkownika: "Sprawdź w internecie o średnich stawkach za dane
czynności i wpisz sugerowaną stawkę rynkową." Zrobione przez ~20 wyszukiwań
web dla poszczególnych grup prac (nie z pamięci modelu — zgodnie z zasadą
"zmierz, nie zgaduj"). Metodologia:

- **Sama robocizna, bez materiału** (materiał dokłada się osobno, różne ceny
  regionalnie i zależnie od dostawcy — nie da się sensownie uśrednić).
- **Średnia krajowa**, nie stawki dla Warszawy/Krakowa (te bywają o 20-50%
  wyższe — regionalna zmienność jest realna i stawka i tak jest edytowalna).
- Gdy źródła podawały przedział (np. "35-55 zł/m²") — wzięta wartość
  środkowa, zaokrąglona do pełnych/połówkowych złotych.
- Źródła: muratordom.pl, kb.pl, cenauslug.pl, budowalka.pl, adrem.org.pl,
  ogarnijremont.pl, cennikibudowlane.com.pl i kilkanaście innych — pełne
  cytaty i zakresy widoczne w historii tej sesji, nie duplikowane tu w
  całości, żeby nie rozdymać pliku.

Przykładowe stawki (robocizna, zł, pełna lista 60 pozycji w `js/db.js` →
`DOMYSLNY_CENNIK`):

| Czynność | Jednostka | Stawka | Zakres w źródłach |
| --- | --- | --- | --- |
| Malowanie końcowe ścian (2-3 warstwy) | m² | 22 zł | 17-50 zł/m² |
| Gładź gipsowa | m² | 50 zł | 45-62 zł/m² |
| Tynkowanie (gipsowe) | m² | 44 zł | 43-45 zł/m² |
| Płytki ścienne | m² | 100 zł | 70-120 zł/m² |
| Płytki podłogowe (gres) | m² | 110 zł | 90-190 zł/m² (format-zależne) |
| Panele podłogowe | m² | 44 zł | 35-55 zł/m² |
| Wylewka samopoziomująca | m² | 40 zł | 27-55 zł/m² |
| Ścianka działowa GK | m² | 100 zł | 65-160 zł/m² |
| Sufit podwieszany GK | m² | 120 zł | 90-180 zł/m² |
| Punkt elektryczny | pkt | 130 zł | 90-190 zł/pkt |
| Punkt hydrauliczny | pkt | 300 zł | 150-450 zł/pkt |
| Montaż drzwi wewnętrznych | szt. | 350 zł | 300-600 zł/komplet |
| Montaż WC/umywalki | szt. | 250 zł | 200-400 zł/szt. |
| Wywóz gruzu | kpl. | 700 zł | kontener 640-2600 zł (wg m³) |
| Montaż klimatyzacji (split) | kpl. | 1500 zł | 1200-2500 zł |

11/60 pozycji ma `stawka: 0` ("stawka nieustalona" w UI) — czynności
organizacyjne/zbyt zróżnicowane (opracowanie projektu, harmonogram, zakup
materiałów, zabezpieczenie mieszkania, demontaż ogólny, wentylacja/rekuperacja,
wymiana okien, usunięcie zabezpieczeń, odbiór techniczny, dekory ścienne,
smart home) — zgodnie z decyzją użytkownika, żeby nie zmyślać ceny tam,
gdzie realnie nie ma jednej sensownej stawki za jednostkę.

**Ważne zastrzeżenie do przekazania dalej:** to są stawki orientacyjne z
połowy 2026, głównie robocizna, bez regionalnego różnicowania — realne ceny
konkretnego fachowca mogą się różnić o dziesiątki procent w dowolną stronę.
Cały sens tego, że są w edytowalnym cenniku, a nie zaszyte na twardo w
kodzie: użytkownik/kolega ma je zweryfikować i dopasować do swoich
prawdziwych stawek przy pierwszym użyciu.

## Co zmienione i wdrożone

- Pełna struktura plików: `index.html`, `manifest.webmanifest`, `sw.js`,
  `css/style.css`, `js/{app,db,calc}.js`, ikony PNG (wygenerowane czystym
  Pythonem, bez zewnętrznych bibliotek — `PIL`/`numpy` nie są zainstalowane
  na tym komputerze i nie instalowałem ich bez pytania).
- `package.json` z `"type": "module"` (potrzebne do testowania `calc.js`
  przez `node` — biblioteka ES modules).
- `.claude/launch.json` — serwer deweloperski (`python -m http.server 5501`).

## Jakie liczby zmierzone

Test logiki (`node js/calc.test.mjs`): **10/10 OK** — kwoty pozycji,
sumy per kategoria, suma całkowita, przypadki brzegowe (pusta lista,
nieprawidłowe dane wejściowe → 0 zamiast NaN).

Kategorie i podkategorie (2026-09-26, lista podana przez użytkownika):
**przed: 12 kategorii / 0 podkategorii** (poprzedni generyczny model) →
**po: 14 kategorii / 60 podkategorii**, policzone programowo z danych
źródłowych w `db.js` (nie z pamięci) i zweryfikowane po zasiewie w
świeżej bazie IndexedDB: `pobierzKategorie()` zwraca 14 pozycji we
właściwej kolejności etapów, dropdown "Typowa czynność" w obu
formularzach (kosztorys i cennik) pokazuje **14 grup / 60 opcji**.
Wybór podkategorii "Montaż armatury łazienkowej..." → auto-wypełnienie
kategorii "Biały montaż i osprzęt" + nazwy, poprawnie (sprawdzone przez
odczyt wartości pól po evencie `change`).

Pułapka po drodze: pierwsza wersja grupowania (`Map` budowana z kolejności
elementów w tablicy `podkategorie` posortowanej globalnie po `kolejnosc`)
dawała **przemieszane kategorie** zamiast kolejności etapów remontu —
poprawione przez budowanie grup w kolejności `kategorie` (już poprawnie
posortowanych), nie w kolejności napotkania w płaskiej liście podkategorii.

**Druga, poważniejsza pułapka — realny bug migracji, nie tylko testowy
artefakt:** logika "seeduj kategorie tylko gdy store jest pusty" nie
dotarła do bazy, która już miała stare 12 kategorii z wcześniejszej wersji
(dokładnie taki stan miała moja własna testowa baza na produkcyjnym
`krupek304.github.io` po pierwszym smoke-teście). Efekt: dropdown "Typowa
czynność" pokazywał tylko 2 z 14 grup (te, których nazwa przypadkiem
pokrywała się ze starą listą — "Podłogi" i "Stolarka drzwiowa i okienna").
**Naprawione** przez zmianę logiki na uzupełnianie brakujących kategorii
PO NAZWIE (nie tylko przy pustej bazie) — bezpieczne, addytywne, nic nie
kasuje. Zweryfikowane liczbami: symulacja starej bazy (12 starych kategorii,
0 podkategorii) → po otwarciu przez nowy kod: **24 kategorie** (12 starych
+ 14 nowych − 2 nazwy wspólne) **/ 60 podkategorii**, dropdown "Typowa
czynność" poprawnie pokazuje **14 grup / 60 opcji**. Dla realnego docelowego
użytkownika (czysty telefon, nigdy nie uruchamiał appki) to bez znaczenia —
jego baza i tak wystartuje pusta i dostanie czyste 14 kategorii od razu.

Po wgraniu poprawki (commit `e558053`, cache `majster-v3`) wyczyściłem
**własne** dane testowe na produkcji (`krupek304.github.io/majster`) —
service worker, cache i IndexedDB — i zweryfikowałem stan od zera: **14
kategorii / 60 podkategorii**, dropdown "Typowa czynność" 14 grup, test
15 m² × 90 zł → **1350,00 zł** (zgodne). Produkcja jest teraz w dokładnie
takim stanie, w jakim zobaczy ją kolega przy pierwszym otwarciu.

Test end-to-end w przeglądarce (Browser pane, viewport mobilny 375×812):
- Dodano 2 pozycje do cennika, potem do kosztorysu (20 m² × 45 zł,
  60 m² × 12,50 zł) → **przed: 0 zł / po: 1650,00 zł** (900 + 750,
  zgodne z ręcznym przeliczeniem).
- Sumy per kategoria poprawne: Płytki i okładziny 900,00 zł,
  Malowanie 750,00 zł.
- Usunięcie 1 pozycji: **przed: 1650,00 zł / po: 750,00 zł** (różnica
  dokładnie 900 zł — usunięta pozycja).
- Eksport CSV: przechwycona zawartość Blob zgadza się co do grosza
  (900, 750, RAZEM 1650).
- Persystencja: po pełnym przeładowaniu strony (`navigate`) projekt
  i suma nadal widoczne — IndexedDB trzyma dane między sesjami.
- Cache Storage service workera zawiera wszystkie 10 plików app shellu
  (sprawdzone przez `caches.keys()` + `cache.keys()`).
- `node --check` na wszystkich plikach `.js` — bez błędów składni.
- Usuwanie projektu kasuje też jego pozycje (sprawdzone: lista wraca
  do stanu pustego).

Powtórzony smoke test na **produkcyjnym adresie** (https://krupek304.github.io/majster/,
prawdziwe HTTPS, nie lokalny serwer): manifest wczytuje się poprawnie
(`manifestOk: true`), service worker zainstalował się i ma status
`activated`, `Cache Storage` zawiera `majster-v1`. Dodanie pozycji
4 szt. × 100 zł → **po: 400,00 zł** (zgodne). Dane testowe usunięte
po teście.

### Runda 2 (2026-09-26, wieczór): scalenie cennika z podkategoriami + stawki

Przed: 60 podkategorii bez jednostek/stawek (store `podkategorie`), cennik
pusty poza tym co user/ja dodaliśmy ręcznie. Po: 60 gotowych pozycji cennika
z jednostką i stawką, store `podkategorie` usunięty (baza v3).

- Świeża baza: `pobierzCennik()` → **60 pozycji, 14 kategorii, 49 ze stawką
  >0, 11 ze stawką 0**, jednostki: `usł., m2, mb, szt., pkt, kpl.` — dokładnie
  6 różnych, żadnej "wszystko szt." (pierwotny błąd zgłoszony przez usera).
- Przykład dokładnie z jego zgłoszenia: "Malowanie końcowe ścian..." →
  jednostka **m2**, stawka **22 zł** (nie "szt." jak wcześniej).
- Formularz "Dodaj pozycję": wybór z grupowanego cennika (14 grup w
  dropdownie) → autofill jednostki `m2` i stawki `22` → ilość 30 →
  **podgląd 660,00 zł**, po zapisie kwota na liście też **660,00 zł**.
- **Edycja zapisanej pozycji** (nowa funkcja): kliknięcie wiersza otworzyło
  dialog "Edytuj pozycję" z polami wypełnionymi (30, 22 — zgodne z tym co
  zapisano), zmiana ilości na 40 → **przed: 660,00 zł / po: 880,00 zł**
  (40×22, ta sama pozycja, nie duplikat — na liście nadal jedna pozycja).
- **Edycja pozycji cennika** (nowa funkcja, ekran "domyślne stawki"):
  kliknięcie wiersza "Malowanie końcowe..." → dialog "Edytuj stawkę" ze
  stawką `22` → zmiana na `25` → wiersz na liście pokazuje **25,00 zł/m2**
  (stawka domyślna zaktualizowana trwale, nie tylko dla jednej pozycji).
- Pozycja ze stawką 0 (np. "Opracowanie projektu wnętrza"): w kosztorysie
  pokazuje **"stawka nieustalona"** zamiast "0,00 zł" i kwotę **"—"**
  zamiast "0,00 zł" — nie wygląda jak realna darmowa usługa.
- **Migracja ze starszej bazy zweryfikowana ponownie** (nauczka z pierwszej
  rundy): symulacja bazy w wersji 2 (14 kategorii już poprawnych, 1 stary
  rekord w `podkategorie`, pusty `cennik`) → po otwarciu nowym kodem:
  baza podniesiona do **wersji 3**, store `podkategorie` **usunięty**
  (`db.objectStoreNames` to potwierdza), kategorie nadal **14** (bez
  duplikatów — nazwy się zgadzały), cennik uzupełniony do **60 pozycji**.
  Zero błędów przy usuwaniu store'u w `onupgradeneeded`.
- Po wdrożeniu (commit z tej rundy, cache `majster-v4`) wyczyściłem własne
  dane testowe na produkcji tak jak poprzednio.

### Runda 3 (2026-09-26, później): zgłoszony bug "pusty cennik" + dropdown jednostki

**Diagnoza (przed naprawą, zgodnie z zasadą "najpierw ustal przyczynę"):**
użytkownik zgłosił, że po otwarciu strony cennik jest pusty. Zapytałem, czy
otwierał link wcześniej tego dnia — potwierdził. To wskazuje na jedną
przyczynę: **standalone PWA na iOS nie sprawdza samo aktualizacji** równie
agresywnie jak zwykła karta przeglądarki. Telefon zapamiętał wersję sprzed
dodania cennika (pierwsze otwarcie linku, które mu podałem na starcie tej
sesji) i Service Worker (cache-first) serwował ją dalej mimo kilku moich
aktualizacji na serwerze — dokładnie ten sam mechanizm, na który sam
trafiałem podczas testowania (musiałem robić `preview_stop`+`preview_start`
albo zamykać kartę, żeby zobaczyć nowy kod).

**Naprawa:** nasłuch na `serviceWorker.controllerchange` w `app.js` —
gdy nowy SW przejmuje kontrolę nad już otwartą stroną, strona przeładowuje
się sama, raz. Zweryfikowane **dwustronnie**, żeby nie wprowadzić nowego
błędu (auto-reload w pętli albo niepotrzebny reload przy pierwszej instalacji):
- Świeża instalacja (`controller` był `null` na starcie) → nawigacja,
  2 sekundy oczekiwania → **brak przeładowania**, appka działa normalnie
  (sprawdzone: dane z otwartego wcześniej dialogu przetrwały bez zakłóceń).
- Symulacja prawdziwej aktualizacji: podmieniłem `CACHE_NAZWA` na inną
  wartość (jak przy realnym wdrożeniu), nawigacja → **cache automatycznie
  zmienił się z `majster-v5` na nową wersję po jednej nawigacji**, bez
  żadnej ręcznej interwencji — dokładnie to, czego brakowało.

**Druga zmiana z tej rundy:** pole "Jednostka" w obu formularzach (pozycja
kosztorysu i pozycja cennika) zamienione z wolnego tekstu na `<select>`
z zestawem `szt., m2, mb, pkt, kpl., usł.` — te same 6, których używają
domyślne pozycje cennika. Zweryfikowane: wybór z cennika "Montaż listew
przypodłogowych" autofilluje select na wartość **mb** (widoczna jako
zaznaczona opcja, nie tylko tekst), edycja istniejącej pozycji poprawnie
odtwarza zapisaną jednostkę w dropdownie (**"pkt"** dla pozycji zapisanej
z tą jednostką). Zabezpieczenie przed cichą utratą danych: jeśli jakaś
starsza pozycja miałaby jednostkę spoza tej szóstki (wpisaną ręcznie przed
zmianą), dopisuje się ją jako dodatkową opcję zamiast po cichu zamienić na
"szt." przy zapisie.

### Runda 4 (2026-09-26, wieczór): wszystkie 9 sugestii z listy usprawnień

Użytkownik dostał ode mnie 9 propozycji (3× kategorie, 3× funkcjonalność,
3× wygląd) i poprosił o wdrożenie wszystkich naraz. Zrobione: drugi wymiar
"Pomieszczenie", UI do dodawania i ukrywania kategorii, śledzenie płatności,
wyszukiwarka w cenniku i w wyborze pozycji, nagłówek do PDF z danymi firmy,
tryb ciemny (systemowy), ikony kategorii, pasek podziału kosztów. Baza
podniesiona do **wersji 4** (nowe store'y `platnosci`, `ustawienia`).

Zweryfikowane liczbami, po kolei:

- **Pomieszczenie + przełącznik grupowania**: dodano 2 pozycje w różnych
  kategoriach i pomieszczeniach (Malowanie/Łazienka 20 m²×22 zł=440 zł,
  Płytki/Kuchnia 10 m²×110 zł=1100 zł) → suma **1540,00 zł** (zgodna).
  Grupowanie "Wg pomieszczenia" poprawnie pokazało nagłówki "ŁAZIENKA" i
  "KUCHNIA" zamiast kategorii, z kategorią jako tag drugiego wymiaru w
  wierszu pozycji.
- **Pasek podziału kosztów**: dla sumy 1540 zł (440+1100) pokazał **29% i
  71%** — dokładnie 440/1540 i 1100/1540 zaokrąglone. Przy jednej kategorii
  pasek poprawnie się nie pokazuje (brak sensu porównywać jedną wartość
  samą ze sobą).
- **Płatności**: dodanie wpłaty 500 zł → **Zapłacono: 500,00 zł / Pozostało:
  1040,00 zł** (1540−500, zgodne); usunięcie tej wpłaty → **z powrotem
  0,00 zł / 1540,00 zł**. Usunięcie całego projektu z płatnością: **przed
  usunięciem 1 płatność w bazie, po usunięciu 0** (zweryfikowane wprost na
  `pobierzPlatnosciProjektu`, ze świeżym importem modułu — pierwsza próba
  dała fałszywy negatyw przez cache modułów ES w tej samej karcie
  przeglądarki, nie przez błąd w kodzie; druga próba ze świeżym `import()`
  potwierdziła poprawne działanie).
- **Wyszukiwarka w cenniku**: przed filtrem **60** pozycji, fraza "gniazdka"
  → **1** pasująca pozycja ("Montaż osprzętu elektrycznego..."). Wyszukiwarka
  w dropdownie "Z cennika" (dodawanie pozycji): fraza "malowanie" → **3
  widoczne opcje w 2 grupach** (z 60/14 wcześniej).
- **Zarządzanie kategoriami**: ukrycie "Prace dodatkowe i opcjonalne" →
  przycisk zmienił się na "Pokaż", a w dropdownie wyboru kategorii przy
  dodawaniu pozycji liczba opcji spadła z **15 do 14** (po wcześniejszym
  dodaniu własnej kategorii "Ogród / Taras", która w dropdownie **jest**
  widoczna — dodawanie i ukrywanie działają niezależnie, sprawdzone razem).
- **Dane firmy → nagłówek druku**: przed zapisaniem danych firmy nagłówek
  pokazywał tylko "Kosztorys / Projekt / Klient / Data" (bez linii firmy);
  po zapisaniu "Majster Kowalski" + telefon → nagłówek doszedł o linię
  **"Majster Kowalski · tel. 600100200"**.
- **CSV**: nowa kolumna "Pomieszczenie" obecna i wypełniona poprawnymi
  wartościami dla obu pozycji testowych, RAZEM nadal **1540**.
- **Migracja v3 → v4**: symulacja starej bazy (1 kategoria bez pola
  `ukryta`, 1 własna pozycja cennika, brak store'ów `platnosci`/`ustawienia`)
  → po otwarciu nowym kodem: **14 kategorii, 61 pozycji cennika** (60 nowych
  + 1 stara zachowana), nowe store'y utworzone i puste, wersja bazy **4**,
  zero błędów. Stara, ręcznie dodana pozycja cennika przetrwała nietknięta.
- **Tryb ciemny**: zweryfikowany wizualnie w obu wariantach (przełączenie
  emulacji `colorScheme` w narzędziu) — czytelny kontrast, kolory
  płatności/paska podziału widoczne w obu motywach, brak "białych dziur".
- Poprawka przy okazji: `usunProjekt` **nie kasował** wcześniej powiązanych
  płatności (osierocone rekordy w bazie) — dodane w tej samej rundzie,
  zanim trafiło na produkcję.

### Runda 5 (2026-09-26, wieczór): 7 usprawnień funkcjonalności i prostoty

Użytkownik dostał ode mnie 7 propozycji (4 funkcjonalność, 3 prostota) i
poprosił o wdrożenie wszystkich. Zrobione: eksport/import kopii zapasowej,
duplikowanie projektu, udostępnianie systemowe, status projektu, szablony
całych pomieszczeń, onboarding, zapamiętywanie ostatniej ilości.

- **Status projektu**: nowy projekt startuje jako "Wycena" → zmiana na
  "W trakcie" → odznaka na liście projektów pokazuje **"W trakcie"**
  (zgodna z wybranym stanem, sprawdzone po przełączeniu widoku).
- **Duplikowanie projektu**: oryginał z 6 pozycjami (suma **1484,00 zł**)
  → duplikat **"Kopia - ..."** ma dokładnie **1484,00 zł** (te same pozycje,
  nowe ID, bez płatności — zgodnie z decyzją, że to nie jest historia
  zlecenia tylko szablon do wypełnienia od nowa).
- **Szablon pomieszczenia**: szablon "Łazienka" pokazał **6 checkboxów**
  (zgodnie z definicją), odznaczyłem 1 → dodało się **5 pozycji**, każda
  z tagiem "📍 Łazienka" i ilością startową 1.
- **Zapamiętywanie ilości**: dodanie pozycji z cennika z ilością **17** →
  przy kolejnym wyborze TEJ SAMEJ pozycji cennika pole ilości samo
  wypełniło się na **17** (localStorage, nie baza — to lokalna wygoda).
- **Eksport/import kopii zapasowej — najważniejszy test tej rundy.**
  Pierwsza wersja importu robiła `put` po ID wprost dla WSZYSTKICH store'ów,
  co przy przywracaniu na już zasianej (świeżej) instalacji **podwoiłoby**
  60 domyślnych pozycji cennika i 14 kategorii (różne ID = różne rekordy,
  te same nazwy). Znalezione i naprawione PRZED wdrożeniem: kategorie/cennik
  są teraz dopasowywane po nazwie i aktualizowane, nie duplikowane.
  Zweryfikowane liczbami na dwóch "telefonach" (dwie karty przeglądarki z
  osobno czyszczoną bazą): "telefon A" ma stawkę malowania ręcznie
  zmienioną na **25 zł** (domyślna to 22) i 1 projekt → eksport → **"nowy
  telefon"** (świeża baza, własny seed: stawka malowania = **22**, 60
  pozycji cennika) → import kopii → **60 pozycji cennika (nie 120)**,
  stawka malowania **25** (przywrócona z kopii, nadpisała świeży domyślny
  seed), projekt "Projekt z telefonu A" obecny. Dodatkowo przetestowany
  cały przepływ przez prawdziwy `<input type="file">` (nie tylko funkcję
  wprost) — zaimportowane dane firmy pojawiły się poprawnie po wybraniu pliku.
- **Web Share**: `navigator.share` niedostępne w środowisku testowym
  (typowe dla przeglądarki desktopowej bez tego API) → przycisk "Udostępnij"
  poprawnie ukryty. Po drodze znaleziony i naprawiony **realny bug**:
  atrybut `hidden` nie działał na przyciskach (`.btn { display:
  inline-block }` ma tę samą specyficzność co domyślne `[hidden]`
  przeglądarki i wygrywał jako reguła autorska) — przycisk był fizycznie
  widoczny mimo `hidden=true`. Naprawione dopisaniem `[hidden] { display:
  none !important; }`, zweryfikowane: `display` zmienione z `block` na
  `none` po poprawce.
- **Onboarding**: pokazuje się przy pierwszym uruchomieniu (świeży
  `localStorage`), po zamknięciu ustawia flagę i **nie pojawia się ponownie**
  przy zmianie zakładek (sprawdzone: przełączenie Cennik → Projekty nie
  otworzyło dialogu drugi raz).

### Runda: przegląd całego kodu pod kątem błędów (2026-09-27)

**Uwaga o luce w tym pliku:** między "Rundą 5" wyżej a tą sekcją miało miejsce
sporo niezanotowanej tu pracy w tej samej długiej sesji (zakładka Podsumowanie
miesięczne/roczne, zdjęcia do pozycji kosztorysu, powiadomienia o zbliżającym
się/rozpoczynającym projekcie, ikony statusów, skeleton loading, komunikat o
prywatności, nowy efekt zakończenia projektu, usunięcie CSV/konfetti) — nie
zostało to tu opisane wcześniej z braku czasu na koniec tamtych podsesji.
`js/app.js` ma teraz ~1900 linii, `js/db.js` ~890 — numery linii w sekcjach
"Runda 1-5" wyżej i w `MAPA.md` są przez to **nieaktualne**. `MAPA.md` wymaga
pełnego odświeżenia przy najbliższej okazji (nie zrobione w tej rundzie -
zbyt duży, osobny nakład pracy, żeby zrobić to rzetelnie przy okazji audytu
błędów).

Na wyraźną prośbę użytkownika ("sprawdź cały kod pod kątem błędów, luk itd. i
napraw je wszystkie") przeprowadzony pełny przegląd `js/app.js`, `js/db.js`,
`js/calc.js`, `sw.js`, `index.html` przez 6 niezależnych "kątów" (poprawność
w app.js, poprawność w db.js/calc.js, spójność między plikami, redukcja
duplikacji, wydajność, zgodność z CLAUDE.md + PWA/offline). Każde zgłoszenie
zweryfikowane osobiście czytaniem kodu przed naprawą (nie na słowo agenta).

**Naprawione, z liczbami:**

- `duplikujProjekt` nie ustawiał `data_rozpoczecia`/`data_zakonczenia` (w
  przeciwieństwie do `dodajProjekt`) i nadawał wszystkim skopiowanym pozycjom
  identyczny znacznik czasu, PLUS pobierał je bez sortowania po `data` przed
  nadaniem nowych znaczników (błąd znaleziony DRUGI RAZ, we własnej pierwszej
  poprawce). Test: duplikat 3 pozycji A/B/C → **przed poprawką kolejność
  B/A/C (losowa), po poprawce A/B/C** (zgodna z oryginałem); `data_rozpoczecia`
  duplikatu: **przed `undefined`, po `2026-09-27`**.
- `esc()` (używany też w atrybutach HTML) nie escapował cudzysłowu - potencjalne
  wstrzyknięcie atrybutu (np. przez zaimportowaną od kogoś innego kopię
  zapasową). Test: `esc('x" onfocus="..." autofocus="x')` → teraz
  `x&quot; onfocus=...` (nieszkodliwy tekst), sprawdzone też na żywo w polu
  szukania projektów - atrybut `value` ma teraz dokładnie **5 atrybutów**
  (bez wstrzykniętych dodatkowych), a normalny tekst z polskimi znakami i `&`
  nadal wyświetla się poprawnie.
- Usunięcie kategorii domyślnej "na stałe" (`usunKategorieRazemZCennikiem`)
  wracało samo po zamknięciu i otwarciu appki, bo `zapewnijDaneStartowe`
  dogrywało brakujące domyślne kategorie po nazwie bez pamiętania, że to było
  świadome usunięcie. Naprawione przez listę "usuniętych na stałe" w
  `ustawienia`. Test: **14→13 kategorii po usunięciu, nadal 13 po symulacji
  restartu appki** (przed poprawką wracało do 14); reset "Przywróć domyślny
  cennik" poprawnie czyści tę listę i przywraca **14/14**.
- Podwójne kliknięcie "Usuń" (wpłata / pozycja cennika / pozycja kosztorysu)
  rzucało nieobsłużony `TypeError`, bo drugi klik trafiał już nieistniejący
  rekord. Naprawione warunkiem przed pokazaniem toasta "Cofnij". Test: dwa
  kolejne wywołania `usunPlatnosc` na tym samym id → **pierwsze zwraca
  obiekt, drugie `undefined` (jak oczekiwano), bez wyjątku**.
- Service worker cache'ował KAŻDĄ odpowiedź (także 404/500) jako poprawną, a
  fallback przy braku sieci i braku cache zwracał zawsze `undefined` zamiast
  sensownej odpowiedzi. Naprawione: cache tylko `odpowiedz.ok`, offline
  fallback dla nawigacji podstawia zapisaną `index.html`.
- `zapiszDaneFirmy`/`zapiszLogoFirmy` (zmiana telefonu vs wybór logo tuż po
  sobie) mogły się cicho nadpisywać (ten zapis, co skończy się jako drugi,
  wygrywa całym rekordem). Naprawione kolejkowaniem zapisów w jedną sekwencję.
- Fallback daty rozpoczęcia projektu (`dataRozpoczeciaProjektu`, dla starych
  projektów bez pola) liczył datę z `data_utworzenia` przez ucięcie stringa
  ISO (czas UTC) zamiast przeliczenia na czas lokalny - ta sama klasa błędu,
  którą `dzisiajYMD()` miał wcześniej wyeliminować, wróciła w nowym miejscu.
  Naprawione nowym `ymdLokalny()`.
- Wyłączone pole kategorii w "Nowa pozycja" nie miało domyślnej opcji, więc
  przy ręcznie wpisanej (nie z cennika) czynności przeglądarka cicho zapisywała
  PIERWSZĄ kategorię z listy. Test: **przed poprawką kategoria = nazwa
  pierwszej kategorii na liście, po poprawce kategoria = `""` (Bez kategorii)**
  - wybór z cennika (główna ścieżka) nadal poprawnie ustawia prawdziwą kategorię
  (sprawdzone: `"Przygotowanie i planowanie"` po wyborze pozycji z cennika).
- Data wpłaty parsowana przez `new Date(p.data)` bez `T00:00:00` (jedyne
  takie miejsce w pliku) - ujednolicone z `formatujDateYMD`.
- Dodatkowo (mniejsze, przy okazji): kolizja `kolejnosc` kategorii po
  usunięciu jednej z nich (`.length` zamiast max+1 - ten sam błąd, co
  `dodajKategorie` już wcześniej naprawił gdzie indziej); kaskadowe usuwanie
  projektu/pozycji/kategorii teraz w JEDNEJ transakcji IndexedDB (atomowe -
  przerwanie w trakcie nie zostawia częściowo skasowanych danych) przez nowy
  helper `withStores`; import kopii zapasowej z brakującym polem `data` w
  pozycji nie wywala już całego widoku kosztorysu (dogrywa bezpieczną wartość
  zamiast rzucać wyjątkiem przy sortowaniu); `eksportujCalaBaze` czyta 7
  store'ów równolegle zamiast po kolei; lista Projektów i zakładka Podsumowanie
  liczą sumy projektów przez JEDNO zbiorcze zapytanie zamiast osobnego na
  każdy projekt (zweryfikowane: wyniki identyczne co do grosza z metodą
  poprzednią, na 3 testowych projektach: 46,16 / 99,95 / 0,00 zł).
- **Świadomie NIE zmienione** (sprawdzone, że to nie błąd): `stawka: 0` jako
  "stawka nieustalona" - to udokumentowana, zamierzona konwencja tego cennika
  (11 pozycji celowo bez sensownej jednej ceny), nie pomyłka.

Wszystkie zmiany: `node --check` bez błędów na `app.js`/`db.js`/`sw.js`/
`calc.js`, `node js/calc.test.mjs` **16/16 OK** przed i po każdej grupie
zmian, dane testowe utworzone do weryfikacji usunięte po sobie (środowisko
testowe w Browser pane wróciło do 0 projektów / 14 kategorii domyślnych).

### Runda: bezpieczeństwo danych lokalnych (2026-09-27, po przeglądzie błędów)

Na prośbę użytkownika ("zadbajmy o kwestie bezpieczeństwa... skoro wszystko
zapisuje się tylko na telefonie i żadne dane nie są w internecie") - diagnoza
wykazała brak nagłówka CSP, brak limitów długości pól tekstowych, brak limitu
rozmiaru plików (zdjęcia/logo/import), i import kopii zapasowej działający
BEZ żadnego potwierdzenia (jedno stuknięcie w zły plik = ciche scalenie/
nadpisanie danych). Zapytany o blokadę PIN (jedyne realne zabezpieczenie na
wypadek zgubionego/udostępnionego telefonu) - użytkownik nie miał preferencji,
więc zgodnie z rekomendacją (redukuje ryzyko utraty danych) **PIN NIE został
zbudowany** - to zostaje otwarte, do ponownego rozważenia jeśli scenariusz
"ktoś inny bierze telefon do ręki" stanie się realny.

Wdrożone:

- **Content-Security-Policy** (`index.html`, meta tag) - `script-src 'self'`
  (bez `'unsafe-inline'`) jako druga warstwa obrony obok poprawki `esc()` z
  poprzedniej rundy: nawet gdyby jakieś przyszłe miejsce w kodzie zapomniało
  escapować tekst użytkownika, wstrzyknięty `onfocus="..."` czy `<script>`
  i tak by się nie wykonał. Wymagało wydzielenia jedynego inline `<script>`
  (wykrywanie zapisanego motywu) do osobnego pliku `js/motyw.js` (CSP bez
  `'unsafe-inline'` blokuje TAKŻE inline skrypty, nawet własne, nieszkodliwe).
- **`maxlength` na wszystkich polach tekstowych** zapisywanych do bazy (nazwa
  projektu/pozycji/klient/pomieszczenie/opis wpłaty/dane firmy/nazwa
  kategorii) - 100-200 znaków zależnie od pola, żeby absurdalnie długi wklejony
  tekst (przypadkiem albo przez uszkodzony import) nie rozdymał bazy ani nie
  spowalniał renderowania list.
- **Limit rozmiaru pliku zdjęcia/logo** (20 MB) sprawdzany PRZED próbą
  zdekodowania jako obraz - bardzo duży/wadliwy plik (np. pomyłkowo wybrane
  wideo) potrafił wcześniej zawiesić kartę na słabszym telefonie.
- **Potwierdzenie przed importem kopii zapasowej** ("Import scali dane...
  Kontynuować?") + limit rozmiaru pliku (50 MB) przed próbą `JSON.parse` -
  wcześniej jedno stuknięcie w zły plik natychmiast, bez ostrzeżenia, scalało
  cennik/kategorie i NADPISYWAŁO projekty/pozycje/płatności o tych samych ID.

Sprawdzone i uznane za NIEobecne zagrożenia (bez zmian): zero wywołań
`fetch`/`XHR`/`eval`/`Function`/`document.write` w całym `js/`, zero
zewnętrznych linków (`target="_blank"`), pliki `<input type="file">` mają
`accept="image/*"`/`"application/json"`, manifest i service worker poprawne.

**Zweryfikowane w przeglądarce:** CSP nie zablokowało niczego (SW nadal się
rejestruje, `motyw.js` nadal ustawia tryb ciemny/jasny przed narysowaniem
strony, wszystkie dialogi/ikony/style inline działają, brak jakiegokolwiek
komunikatu "Refused to..." w konsoli w całej sesji testowej); `maxlength`
potwierdzony na polu nazwy projektu (200); potwierdzenie importu przetestowane
programowo w obie strony (Anuluj → import się nie wykonuje, pole czyszczone;
OK → import przechodzi normalnie, dokładnie jak wcześniej). `node --check`
bez błędów na wszystkich plikach, `calc.test.mjs` 16/16 OK. `sw.js` →
`CACHE_NAZWA` na `majster-v28` (dodany `js/motyw.js` do listy cache).

### Runda: przypomnienie o kopii zapasowej + podpowiedź instalacji (2026-09-27)

Na pytanie "co jeszcze wymaga usprawnienia" wymieniłem 5 rzeczy, użytkownik
wybrał 2 z nich do wdrożenia:

- **Przypomnienie o kopii zapasowej** (`js/app.js`, `sprawdzPrzypomnienieKopii`,
  wywoływane przy starcie appki obok istniejącego sprawdzania powiadomień o
  projektach). Jeśli jest choć 1 projekt i minęło ≥14 dni od ostatniego
  eksportu (albo nigdy go nie było) - dodaje powiadomienie do istniejącego
  dzwonka (nie nowy UI). Data ostatniego eksportu w `localStorage`
  (`o-majster-ostatni-eksport`, ustawiana w handlerze "Eksportuj kopię
  zapasową") - świadomie NIE w bazie/kopii zapasowej, bo to fakt o TYM
  urządzeniu, nie o samych danych (po przywróceniu na nowym telefonie appka
  słusznie "nie pamięta" żadnego eksportu stąd). Deduplikacja: nie dodaje
  drugiego przypomnienia, jeśli poprzednie jest młodsze niż 14 dni.
  Zweryfikowane liczbami: świeży projekt bez eksportu → **0→1** powiadomień
  typu `kopia-zapasowa` po starcie appki, **nadal 1** po dwóch kolejnych
  przeładowaniach (bez duplikatu), treść poprawnie widoczna w liście
  powiadomień w UI.
- **Podpowiedź "dodaj do ekranu głównego"** (`js/app.js`, baner na górze
  listy Projektów, `css/style.css` klasa `.uwaga-instalacja`). Android/Chrome:
  przechwycone `beforeinstallprompt` → prawdziwy przycisk "Zainstaluj"
  wywołujący natywny prompt. **iOS Safari nie wspiera tego API w ogóle**
  (celowe ograniczenie Apple) - tam appka pokazuje samą instrukcję
  ("Udostępnij → Dodaj do ekranu głównego") bez przycisku, bo nie da się tego
  zautomatyzować. Trwałe zamknięcie (przycisk "x") zapisuje się w
  `localStorage` (`o-majster-instalacja-ukryta`) i baner już nigdy więcej się
  nie pojawia na tym urządzeniu, nawet gdy przeglądarka ponownie zaoferuje
  `beforeinstallprompt`. Zweryfikowane przez symulację zdarzenia
  `beforeinstallprompt` w konsoli: baner pojawia się z przyciskiem, klik
  wywołuje `prompt()` i chowa baner; klik "x" trwale ukrywa (potwierdzone po
  przeładowaniu strony i ponownym zdarzeniu - baner się nie pojawił).

`node --check` bez błędów, `calc.test.mjs` 16/16 OK, `sw.js` →
`CACHE_NAZWA` na `majster-v29`.

### Runda: wizualizacje i animacje (2026-09-27)

Na prośbę "wprowadź wszystkie" (z 6 wcześniej zaproponowanych pomysłów: 3
wizualne + 3 animacje) wdrożone wszystkie, plus przy okazji znalezione i
naprawione 2 błędy.

**Wizualizacje:**
- **Wykres trendu wpłat** (12 słupków CSS, widok roczny Podsumowania) -
  wysokość liczona względem najwyższego miesiąca w roku. Zweryfikowany
  liczbami: wpłaty 1200/2500/500/800 zł w czerwcu-wrześniu → wysokości
  słupków 48%/100%/20%/32% (dokładnie zgodne, licząc względem max=2500).
- **Donut zamiast poziomego paska** w podziale kosztów wg kategorii
  (kosztorys) - rysowany ręcznie SVG (`stroke-dasharray`/`dashoffset` na
  okręgach), bez biblioteki wykresów. Zweryfikowany na 3 kategoriach
  (650/880/660 zł z sumy 2190) → segmenty 30%/40%/30%, etykieta w środku
  "3 KATEGORIE" (poprawna polska odmiana).
- **Pasek postępu wpłat na karcie projektu** - zielony pasek pod nazwą
  klienta, szerokość = zapłacono/suma. Zweryfikowany: 800 zł z 2190 zł →
  36,5% (dokładnie zgodne), widoczny wizualnie na liście.

**Animacje:**
- **Count-up rozszerzony na Podsumowanie** (`animujKwote`, wcześniej tylko
  suma kosztorysu) - suma "Wpłacono w {rok/miesiąc}" animuje się przy każdej
  zmianie okresu. Zweryfikowane przez próbkowanie w trakcie animacji:
  5000→2696→1223→417→76→1→0 zł (poprawna krzywa ease-out, kończy na
  dokładnej wartości docelowej).
- **Wzrost słupków/paska/donuta od zera** (`@starting-style`, ten sam wzorzec
  co istniejące już "wjechanie" pozycji na liście).
- **Mikro-feedback dotyku rozszerzony** na elementy, które go nie miały:
  karty projektów (`.karta-projekt`, wcześniej zero reakcji na dotyk),
  wiersze pozycji (`.pozycja`, miały już zmianę tła, dodane `scale(0.98)`),
  przyciski nawigacji okresu. Sam mechanizm (`transform: scale()` na
  `:active`) już istniał wcześniej dla `.btn`/`.btn-segment`/`.tab-btn` -
  rozszerzony na elementy, które go nie miały, a nie wymyślony od nowa.

**Błędy znalezione i naprawione przy okazji (na prośbę "sprawdź kod i
napraw"):**
1. `duplikujProjekt` z poprzedniej rundy nadal miał błąd: pobierał pozycje
   do skopiowania BEZ sortowania po `data` przed nadaniem nowych znaczników
   czasu (`getAll` po indeksie zwraca kolejność wg losowego UUID, nie wg
   `data`) - kolejność pozycji w duplikacie nadal była losowa mimo
   wcześniejszej "naprawy" unikalnych znaczników czasu. Test: A/B/C →
   przed poprawką B/A/C, po poprawce A/B/C.
2. Donut (etykieta środkowa) i cała trójka `odmienDni`/`odmienProjekty`/
   `odmienPozycje` miały identyczny, trzykrotnie skopiowany algorytm polskiej
   odmiany - scalone do jednej funkcji `odmien(n, jeden, kilka, wiele)`,
   przy okazji naprawiając błędną (dwuwariantową zamiast trzywariantowej)
   odmianę w nowej etykiedzie donuta. Zweryfikowane na 20 przypadkach
   brzegowych (0, 1, 2-4, 5-21, 12-14, 22, 100+) - wszystkie gramatycznie
   poprawne.
3. **Donut na wydruku/PDF byłby nieczytelny w trybie ciemnym** - używał
   zmiennych motywu (`--linia`/`--tekst`/`--tekst-slaby`), które w trybie
   ciemnym są jasne, a strona przy druku wymusza białe tło (`body{background:
   white}` w `@media print`) - jasny tekst na białej kartce = niewidoczny.
   Naprawione tym samym wzorcem, którego appka już używa dla innych
   elementów przy druku (`color: black` wprost w bloku `@media print`).
   Przy okazji naprawiony też PRE-ISTNIEJĄCY, nigdy wcześniej niezauważony
   ten sam problem w legendzie (`.legenda`) - istniał od czasu wprowadzenia
   paska podziału kosztów, niezależnie od tej rundy.

`node --check` bez błędów, `calc.test.mjs` 16/16 OK, wszystko zweryfikowane
liczbami w przeglądarce, dane testowe posprzątane. `sw.js` → `CACHE_NAZWA`
na `majster-v30`.

## Czego NIE udało się sprawdzić

- **Rzeczywiste działanie na fizycznym iPhone** — testowałem w Browser
  pane (silnik przeglądarki na tym komputerze, w tym pod prawdziwym
  produkcyjnym HTTPS) z emulacją viewportu mobilnego, nie na fizycznym
  urządzeniu. Nie sprawdziłem: jak `<dialog>` zachowuje się z klawiaturą
  ekranową iOS, czy "Dodaj do ekranu głównego" faktycznie poprawnie
  zainstaluje ikonę i uruchomi appkę w trybie `standalone` na iOS Safari.
- **Wydruk/eksport do PDF** — sekcja `@media print` w CSS jest napisana
  i logicznie poprawna (ukrywa nawigację i przyciski, pokazuje czysty
  układ kosztorysu), ale nie zweryfikowałem jej wizualnie — wymaga
  natywnego dialogu drukowania, którego nie da się w pełni sprawdzić
  w tym narzędziu.
- **Prawdziwe działanie offline** (tryb samolotowy) na iPhonie — na
  komputerze sprawdziłem tylko, że `Cache Storage` zawiera wszystkie
  pliki; nie testowałem realnego wyłączenia sieci na urządzeniu mobilnym.
- **Instalacja na drugim folderze** (`D:\Zainstalowane aplikacje z Claude\Majster`)
  — folder utworzony, ale pusty; kopiowanie działającej wersji nie zostało
  jeszcze zrobione (czekam, aż wersja będzie stabilna po realnym teście
  na iPhone kolegi użytkownika — patrz pamięć: docelowy użytkownik appki
  to fachowiec-kolega, nie sam deweloper).
- **Sugerowane stawki rynkowe nie są zweryfikowane z realnymi cenami
  kolegi-fachowca** — to są uśrednione wartości ze źródeł internetowych
  (patrz sekcja wyżej), nie ceny sprawdzone "w terenie". Kolega powinien
  przejrzeć cennik przy pierwszym użyciu i poprawić stawki na swoje.
- **Czy auto-przeładowanie po aktualizacji faktycznie zadziała na
  konkretnym telefonie użytkownika (iOS Safari, PWA dodana do ekranu
  głównego przed dodaniem tej poprawki)** — zweryfikowałem mechanizm w
  Browser pane (symulacja), nie na jego urządzeniu. Jego obecna, już
  zainstalowana ikona wciąż ma STARY kod (sprzed tej poprawki) — sama
  poprawka nie pomoże retroaktywnie, dopóki nie dotrze tam choć raz. Stąd
  instrukcja "wymuś teraz" w mojej odpowiedzi na czacie, niezależna od tego
  mechanizmu.
- **Wygląd nagłówka wydruku w realnym oknie drukowania** — sprawdziłem
  tylko treść HTML (`.naglowek-druku`) i regułę CSS, nie faktyczny podgląd
  wydruku/PDF (jak w poprzedniej rundzie — wymaga natywnego dialogu
  drukowania).
- **Tryb ciemny na prawdziwym iOS Safari** — zweryfikowany przez emulację
  `prefers-color-scheme` w Browser pane, nie na faktycznym iPhonie z
  włączonym trybem ciemnym w ustawieniach systemowych.
- **Podpowiedzi pomieszczeń (`<datalist>`) na iOS Safari** — to jest
  standardowy element HTML, ale Safari na iOS bywa niekonsekwentne w
  renderowaniu datalisty (czasem nie pokazuje sugestii wcale albo pokazuje
  je inaczej niż desktop). Pole samo w sobie działa jako zwykły wolny
  tekst niezależnie od tego, ale wygoda podpowiedzi może być inna niż na
  komputerze.
- **`navigator.share` na prawdziwym iOS Safari** — środowisko testowe go
  nie ma, więc sprawdziłem tylko poprawne ukrycie przycisku, nie samo
  działanie okna udostępniania (jakie aplikacje pokaże system, czy tekst
  sformatuje się czytelnie w WhatsApp/mailu).
- **Przepływ UI dla pozostałych 3 z 4 szablonów pomieszczeń** (Kuchnia,
  Pokój/Salon, Przedpokój/Hol) — przez interfejs przetestowałem szczegółowo
  tylko "Łazienkę" (logika jest identyczna dla wszystkich, ta sama funkcja).
  Za to **poprawność samych nazw** sprawdziłem programowo dla wszystkich
  4 szablonów naraz: wszystkie **22 wpisy w 4 szablonach mają dokładne
  odpowiedniki w cenniku, 0 literówek/rozjazdów** — więc żadna pozycja nie
  zostanie po cichu pominięta przy dodawaniu żadnego z 4 szablonów.

Do rundy wizualizacji/animacji (2026-09-27) dodatkowo:

- **Wydruk/PDF z poprawką donuta** - sprawdzona tylko czytaniem CSS (kolory
  wymuszone na czarny w `@media print`), NIE przez faktyczne otwarcie natywnego
  dialogu drukowania (jak w każdej wcześniejszej rundzie - to ograniczenie
  tego narzędzia, nie zmieniło się).
- **Wygląd donuta/wykresu na wąskim ekranie telefonu** (nie tylko w
  Browser pane na komputerze) - nie testowane na fizycznym urządzeniu,
  podobnie jak reszta appki.

Do rundy przypomnienia o kopii/instalacji (2026-09-27) dodatkowo:

- **Prawdziwe `beforeinstallprompt` na Android Chrome** - przetestowane tylko
  przez symulację (ręcznie skonstruowany `Event`), nie przez faktyczne
  spełnienie kryteriów instalowalności Chrome i odczekanie na prawdziwe
  zdarzenie przeglądarki. Logika obsługi zdarzenia powinna być identyczna,
  ale nie potwierdzone na prawdziwym Androidzie.
- **Instrukcja dla iOS Safari** - sprawdzona tylko czytaniem kodu
  (`czyIOS()` przez `navigator.userAgent`) - nie na faktycznym iPhonie
  (środowisko testowe to Chromium na komputerze, `czyIOS()` tam zawsze
  zwraca `false`, więc ta gałąź w ogóle się nie uruchomiła w testach).

Do rundy bezpieczeństwa (2026-09-27) dodatkowo:

- **Limit 20 MB na zdjęcia/logo** sprawdzony tylko czytaniem kodu (warunek
  `plik.size > ...`) - nie wygenerowałem faktycznego pliku >20 MB, żeby
  zobaczyć realny komunikat błędu w UI.
- **CSP na prawdziwym `https://krupek304.github.io/o-majster/` i na
  faktycznym iPhone Safari** - zweryfikowane tylko w lokalnym Browser pane
  (`http://localhost`). Meta-tag CSP powinien działać identycznie wszędzie,
  ale nie potwierdziłem tego na docelowym urządzeniu/hostingu.
- **PIN/blokada aplikacji NIE zbudowana** (decyzja: brak preferencji
  użytkownika → poszedłem za rekomendacją "nie teraz") - jeśli telefon
  bywa dostępny dla innych osób, warto to rozważyć ponownie.

Do przeglądu 2026-09-27 (błędy z kodu) dodatkowo:

- **Realne "offline" zachowanie service workera po poprawce fetch handlera**
  (cache tylko `.ok`, fallback nawigacji do `index.html`) - sprawdzone tylko
  logicznie i przez brak błędów w konsoli przy normalnym korzystaniu; nie
  testowałem faktycznego wyłączenia sieci (tryb samolotowy/DevTools offline)
  na żadnym z dwóch nowych fragmentów kodu.
- **Wyścig `zapiszDaneFirmy`/`zapiszLogoFirmy`** naprawiony przez kolejkowanie
  zapisów, ale nie odtworzyłem faktycznego równoległego wywołania obu naraz
  (trudne do wiarygodnego wymuszenia w teście) - poprawka zweryfikowana tylko
  przez czytanie kodu (kolejka gwarantuje serializację z definicji), nie
  przez zmierzony przypadek wyścigu przed/po.
- **Reszta zgłoszonych podczas przeglądu usprawnień (nie błędów) NIE została
  wdrożona** - celowo pominięta jako zmiana kosmetyczna/wydajnościowa bez
  wpływu na poprawność: duplikacja `odmienProjekty`/`odmienPozycje`, brak
  indeksu `projekt_id` na store `zdjecia` (pełne skanowanie wszystkich zdjęć
  w appce przy każdym wejściu w kosztorys - wymagałoby bumpa wersji bazy),
  O(12×N) przeliczanie widoku rocznego w Podsumowaniu, duplikacja stylu CSS
  przycisków-ikon.
- **`MAPA.md` nieaktualny** (patrz uwaga wyżej) - nie odświeżony w tej rundzie.

## Co zostaje otwarte

- **Dodać nowy adres do ekranu głównego** (`https://krupek304.github.io/o-majster/`)
  — stary link/ikona wskazujący na `.../majster/` przestał działać (404),
  nie ma automatycznego przekierowania. Dotyczy każdego, kto miał stary
  link, w tym kolegi-fachowca, jeśli już go dostał.
- Realny test na iPhone (najlepiej od razu na telefonie kolegi-fachowca,
  bo to on będzie docelowym użytkownikiem): dodanie do ekranu głównego,
  sprawdzenie ikony, trybu pełnoekranowego, wygody wpisywania na dotyk,
  wygody wybierania z cennika przy 60 pozycjach na małym ekranie.
- Kolega powinien przejrzeć 60 sugerowanych stawek w ekranie "Cennik" i
  skorygować je na swoje realne ceny (i uzupełnić 11 pozycji, które mają
  "stawkę nieustaloną").
- Rozważyć OCR paragonów / zdjęcie jako załącznik do pozycji — odłożone
  jako "nice-to-have" zgodnie z rekomendacją z researchu.
