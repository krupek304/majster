# Przekazanie — Majster

## Stan projektu

Działający MVP: aplikacja PWA do budowania kosztorysu prac remontowych
(pozycje ilość × stawka, kategorie, cennik wielokrotnego użytku, suma
całkowita, eksport CSV, wydruk/PDF przez przeglądarkę). Zero backendu,
zero kosztów, wszystko lokalnie w IndexedDB na urządzeniu.

## Model danych (patrz MAPA.md → js/db.js)

- **Projekt** = jedno zlecenie/mieszkanie, ma własną listę pozycji.
- **Pozycja kosztorysu** = nazwa + kategoria + ilość + jednostka + stawka
  → kwota = ilość × stawka (nigdy nie zgadywana, zawsze wpisana ręcznie).
- **Cennik** = zapisane pary nazwa+kategoria+jednostka+stawka, do szybkiego
  wyboru przy dodawaniu pozycji (auto-wypełnia formularz, można nadpisać).
- **Kategorie** = 12 domyślnych (Prace rozbiórkowe, Elektryka, Hydraulika,
  Malowanie, Płytki, itd.), edytowalne.
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

## Czego NIE udało się sprawdzić

- **Rzeczywiste działanie na iPhone** — testowałem w Browser pane
  (silnik przeglądarki na tym komputerze) z emulacją viewportu mobilnego,
  nie na fizycznym urządzeniu. Nie sprawdziłem: jak `<dialog>` zachowuje
  się z klawiaturą ekranową iOS, czy "Dodaj do ekranu głównego" faktycznie
  poprawnie zainstaluje ikonę i uruchomi appkę w trybie `standalone`.
- **Wydruk/eksport do PDF** — sekcja `@media print` w CSS jest napisana
  i logicznie poprawna (ukrywa nawigację i przyciski, pokazuje czysty
  układ kosztorysu), ale nie zweryfikowałem jej wizualnie — wymaga
  natywnego dialogu drukowania, którego nie da się w pełni sprawdzić
  w tym narzędziu.
- **Prawdziwe działanie offline** (tryb samolotowy) — sprawdziłem tylko,
  że `Cache Storage` zawiera wszystkie pliki; nie testowałem realnego
  wyłączenia sieci i przeładowania strony.
- **Hosting produkcyjny** — appka działa teraz tylko lokalnie
  (`python -m http.server`). Nie wdrożono jej jeszcze na żaden darmowy
  hosting (Cloudflare Pages / GitHub Pages) — to następny krok do zrobienia
  razem z użytkownikiem (wymaga jego konta na wybranej platformie).
- **Instalacja na drugim folderze** (`D:\Zainstalowane aplikacje z Claude\Majster`)
  — folder utworzony, ale pusty; kopiowanie działającej wersji nie zostało
  jeszcze zrobione (czekam, aż wersja będzie stabilna po realnym teście
  na iPhone).

## Co zostaje otwarte

- Realny test na iPhone: dodanie do ekranu głównego, sprawdzenie ikony,
  trybu pełnoekranowego, wygody wpisywania na dotyk.
- Wybór i konfiguracja darmowego hostingu (Cloudflare Pages / GitHub Pages).
- Edycja istniejącej pozycji kosztorysu / cennika (na razie jest tylko
  dodawanie i usuwanie — funkcje `aktualizujPozycjeKosztorysu` i
  `aktualizujPozycjeCennika` w `db.js` już istnieją, ale UI do edycji
  nie jest podpięte — świadomie pominięte na MVP, żeby nie rozdymać
  pierwszej wersji).
- Rozważyć OCR paragonów / zdjęcie jako załącznik do pozycji — odłożone
  jako "nice-to-have" zgodnie z rekomendacją z researchu.
