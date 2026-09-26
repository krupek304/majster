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

## Co zostaje otwarte

- Realny test na iPhone (najlepiej od razu na telefonie kolegi-fachowca,
  bo to on będzie docelowym użytkownikiem): dodanie do ekranu głównego,
  sprawdzenie ikony, trybu pełnoekranowego, wygody wpisywania na dotyk,
  wygody wybierania z cennika przy 60 pozycjach na małym ekranie.
- Kolega powinien przejrzeć 60 sugerowanych stawek w ekranie "Cennik" i
  skorygować je na swoje realne ceny (i uzupełnić 11 pozycji, które mają
  "stawkę nieustaloną").
- Rozważyć OCR paragonów / zdjęcie jako załącznik do pozycji — odłożone
  jako "nice-to-have" zgodnie z rekomendacją z researchu.
