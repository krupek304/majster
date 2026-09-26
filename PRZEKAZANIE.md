# Przekazanie — Majster

## Stan projektu

Działający MVP: aplikacja PWA do budowania kosztorysu prac remontowych
(pozycje ilość × stawka, kategorie, cennik wielokrotnego użytku, suma
całkowita, eksport CSV, wydruk/PDF przez przeglądarkę). Zero backendu,
zero kosztów, wszystko lokalnie w IndexedDB na urządzeniu.

**Wdrożona i działająca pod adresem: https://krupek304.github.io/majster/**
(GitHub Pages, repozytorium publiczne `krupek304/majster`, branch `main`,
HTTPS wymuszony przez GitHub). To jest adres do otwarcia na iPhonie i
dodania do ekranu głównego (Safari → Udostępnij → Dodaj do ekranu głównego).

## Model danych (patrz MAPA.md → js/db.js)

- **Projekt** = jedno zlecenie/mieszkanie, ma własną listę pozycji.
- **Pozycja kosztorysu** = nazwa + kategoria + ilość + jednostka + stawka
  → kwota = ilość × stawka (nigdy nie zgadywana, zawsze wpisana ręcznie).
- **Cennik** = zapisane pary nazwa+kategoria+jednostka+stawka, do szybkiego
  wyboru przy dodawaniu pozycji (auto-wypełnia formularz, można nadpisać).
- **Kategorie** = 14 domyślnych, w pełnej kolejności etapów wykończenia
  mieszkania (od "Przygotowanie i planowanie" po "Prace dodatkowe i
  opcjonalne"), edytowalne. Lista podana przez użytkownika 2026-09-26.
- **Podkategorie** = 60 typowych czynności (po ok. 3-6 na kategorię),
  osobny store `podkategorie`, tylko nazwa + kategoria — **bez jednostek
  i stawek**, bo tego nikt nie podał, a zgadywanie cen jest zabronione
  zasadami projektu. W formularzu dodawania pozycji/cennika wybór
  podkategorii tylko auto-wypełnia kategorię i nazwę; jednostkę i stawkę
  fachowiec zawsze wpisuje sam.
- Pole `dodane_przez` w każdej pozycji = ID użytkownika (dziś zawsze `"ja"`,
  jeden zaszyty rekord w store `uzytkownicy`). To jest **jedyny** element
  pod przyszłe konta — zgodnie z ustaleniem, że teraz jest jeden użytkownik,
  ale architektura ma nie blokować dodania kolejnych kont później. Żadnego
  logowania/UI multi-user nie zbudowano teraz celowo (nie było potrzebne).

## Decyzje z researchu (patrz doc "Majster — Research rynku")

- Platforma: **PWA** (Progressive Web App), nie natywna appka — jedyna
  droga na iPhone spełniająca "zero kosztów, zero cotygodniowej pracy"
  (natywny sideload z darmowym Apple ID wymaga re-podpisywania co 7 dni).
- Struktura pozycji: **ilość × stawka za jednostkę** (nie ryczałt).
- Wiele niezależnych projektów/kosztorysów — nie jeden na raz.
- Własny edytowalny cennik stawek.

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

## Co zostaje otwarte

- Realny test na iPhone (najlepiej od razu na telefonie kolegi-fachowca,
  bo to on będzie docelowym użytkownikiem): dodanie do ekranu głównego,
  sprawdzenie ikony, trybu pełnoekranowego, wygody wpisywania na dotyk.
- Edycja istniejącej pozycji kosztorysu / cennika (na razie jest tylko
  dodawanie i usuwanie — funkcje `aktualizujPozycjeKosztorysu` i
  `aktualizujPozycjeCennika` w `db.js` już istnieją, ale UI do edycji
  nie jest podpięte — świadomie pominięte na MVP, żeby nie rozdymać
  pierwszej wersji).
- Rozważyć OCR paragonów / zdjęcie jako załącznik do pozycji — odłożone
  jako "nice-to-have" zgodnie z rekomendacją z researchu.
