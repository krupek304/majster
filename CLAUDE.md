# Majster — zasady pracy

Ten plik czytasz automatycznie na starcie. Zastosuj go, zanim cokolwiek zrobisz.

## Język i sposób odpowiadania

Piszesz **po polsku**, konkretnie i bez lania wody.

## Zasady, które są ważniejsze od tempa

1. **Najpierw diagnoza, potem naprawa.** Zanim coś zmienisz — ustal przyczynę
   i powiedz mi, co znalazłeś. Nie zgaduj, zmierz.
2. **Nie zgłaszaj niczego jako zrobione, jeśli tego nie sprawdziłeś.**
3. **Mów wprost, czego nie udało się przetestować.** Wolę wiedzieć.
4. Gdy widzisz lepsze rozwiązanie niż to, o które proszę — powiedz to od razu.
5. Gdy polecenie jest niejasne — dopytaj, zanim zaczniesz pracować.
6. Nie instaluj niczego na moim komputerze bez uprzedzenia i zgody.
7. **Gdy moje wymaganie kłóci się z wybraną technologią — powiedz to wprost,
   zanim zaczniesz budować.** Jeśli mówię „ma być bez błędów", a wybrane
   narzędzie tego nie zapewni, to jest sprzeczność do rozstrzygnięcia teraz,
   a nie po napisaniu tysiąca linii.

## Dowodem są liczby, nie deklaracje

- Każdą zmianę logiki potwierdzasz **liczbą przed i po** (ile rekordów, ile
  wierszy, ile trafień). „Działa" bez liczby nie jest wynikiem.
- **Zanim wybierzesz bibliotekę lub silnik — zmierz go na przykładzie.**
  Jeden test na reprezentatywnych danych jest wart więcej niż opis w
  dokumentacji. Wybór technologii podjęty „na wyczucie" potrafi wywrócić
  projekt po dwóch godzinach pracy.
- **Wysoka pewność modelu nie oznacza poprawności.** Jeśli narzędzie zwraca
  własną ocenę pewności, sprawdź, czy błędne wyniki faktycznie dostają niską
  ocenę. Bardzo często nie dostają — i filtr po progu pewności jest wtedy
  bezużyteczny.
- Gdy pomylisz się w oszacowaniu (rozmiar, koszt, czas) — **popraw to jawnie
  i podaj prawdziwą liczbę**, zamiast przemilczeć.
- Gdy test nie przechodzi, najpierw ustal, czy błąd jest w kodzie, czy
  w teście. **Błędne oczekiwanie w teście poprawiasz w teście** i mówisz o tym.

## Nie zgaduj za użytkownika

- Konwersje i interpretacje robisz tylko tam, gdzie zapis jest jednoznaczny.
  Wszystko wątpliwe zostaje w oryginalnej postaci i dostaje adnotację dla
  człowieka. **Ciche zgadywanie to błąd, którego nikt później nie znajdzie.**
- Gdy program przetwarza dane automatycznie, ma zostawić ślad po
  wątpliwościach w samym wyniku — nie tylko na ekranie w trakcie pracy.

## Prywatność moich danych

- Moje zdjęcia, filmy i dokumenty **czytasz tylko wtedy, gdy o to poproszę**.
  Nie kopiujesz ich nigdzie i nie przeglądasz hurtem.
- **Nie przeszukujesz folderów ani dysków spoza wyraźnie nadanego zakresu** —
  nawet diagnostycznie, nawet „tylko żeby sprawdzić". Najpierw pytasz.
- Bazy danych czytasz **na miejscu**, zapytaniami. Nie kopiujesz ich poza
  mój komputer.
- Miniatury i pojedyncze pliki oglądasz, gdy trzeba sprawdzić wynik —
  i mówisz mi, które oglądasz.
- Pliki tymczasowe z testów kasujesz po sobie.
- Jeśli rozwiązanie wymaga wysłania moich danych na zewnątrz (API, usługa
  sieciowa) — **mówisz o tym wprost i czekasz na zgodę**. To jest decyzja,
  nie szczegół techniczny.
- Nie prosisz mnie o wklejenie klucza API ani hasła do czatu. Program czyta
  je ze zmiennej środowiskowej albo z pliku, który wypełniam sam.

## Dwa foldery, zawsze oba

- `D:\Zainstalowane aplikacje z Claude\Majster` — działająca instalacja
- `D:\Projekty Claude\Aplikacja do podsumowania kosztów prac remontowych` — kopia projektu

Zmiana wprowadzona w jednym musi trafić do drugiego. Dane programu leżą osobno,
w `C:\Users\krupe\AppData\Local\Majster` (baza, ustawienia, modele, dzienniki) —
tego folderu **nie nadpisujemy**.

## Zanim wczytasz kod — oszczędzaj kontekst

Kolejność: **`PRZEKAZANIE.md` → `MAPA.md` → dopiero kod, i tylko fragment.**

- `MAPA.md` to spis funkcji z numerami linii. Odświeżasz go po większych
  zmianach.
- Szukaj `Grep`em po nazwie funkcji, czytaj `Read` z `offset` i `limit`.
- **`Edit`, nigdy `Write`** na dużym pliku — nie przepisuj całości, żeby
  zmienić trzy linie.
- Do przeszukiwania wielu plików używaj podagenta — wraca z wnioskiem,
  a nie z zawartością plików.

## Jak testować

Program uruchamiasz z podmienionym katalogiem danych, żeby nie ruszać moich:

```
set MAJSTER_HOME=C:\tmp\test
python -m majster
```

- składnia Pythona: `pyflakes` albo `ast.parse` na każdym zmienionym pliku;
- JavaScript osadzony w HTML: wytnij zawartość `<script>` bez `src` do pliku
  tymczasowego i sprawdź `node --check`;
- logika przetwarzania: wywołaj funkcję wprost i **podaj liczbę przed i po**.
  Tylko liczby są dowodem;
- interfejs graficzny da się testować bez pokazywania okna
  (`QT_QPA_PLATFORM=offscreen`) — buduje się, reaguje na edycję, liczy
  poprawnie. Brak ekranu nie jest wymówką, żeby napisać „nie sprawdziłem";
- **modele i biblioteki, które są na tym komputerze, testujesz naprawdę** —
  zamiast pisać „nie sprawdziłem".

Pułapka, która raz zepsuła testy: `pkill` w poleceniu złożonym potrafi ubić
własną powłokę razem z `cp`, przez co test leci na PUSTYCH danych i daje
zielone, bezwartościowe wyniki. Zawsze sprawdź na starcie, czy dane w ogóle są.

## Pułapki tego komputera (Windows 11, Python 3.12)

- `cv2.imread` i `cv2.imwrite` **nie radzą sobie z polskimi znakami w ścieżce**.
  Czytaj i zapisuj przez `np.fromfile` / `tofile` + `imdecode` / `imencode`.
- Konsola nie wypisze polskich znaków bez `PYTHONIOENCODING=utf-8`. To problem
  wyświetlania, nie danych — nie daj się na to nabrać przy ocenie testu.
- Biblioteki zmieniają kształty zwracanych danych między wersjami głównymi
  (np. OpenCV 5 zwraca z `HoughLinesP` tablicę `(N, 4)` zamiast `(N, 1, 4)`).
  Gdy kod wywala się na rozpakowaniu wyniku — sprawdź wersję, nie przepisuj
  logiki.
- Heredoc w Bashu przy długich plikach potrafi się urwać. Do pisania plików
  używaj `Write`, nie `cat << EOF`.

## Historia zmian

Projekt trzymaj w `git`. Przed większą przeróbką: `git commit`. Dzięki temu
moja pomyłka i Twoja pomyłka są odwracalne jednym poleceniem, a Ty widzisz
różnice zamiast całych plików.

## Na koniec sesji

Zaktualizuj `PRZEKAZANIE.md`: co zmienione i wdrożone, **jakie liczby
zmierzone**, **czego NIE udało się sprawdzić**, co zostaje otwarte. To jest
wejście do następnej sesji — im lepsze, tym mniej kodu trzeba czytać na starcie.

Sekcja „czego nie sprawdzono" jest obowiązkowa i ma być konkretna. „Nie
przetestowano toru z API, bo na komputerze nie ma klucza" jest wartościowe.
„Wszystko działa" nie jest.

---

## Co to za program

Aplikacja do podsumowania kosztów prac remontowych. Szczegóły (jakie dane
wejściowe, jaki format wyjścia, co jest nienaruszalne, czy działa offline,
jakie są główne ograniczenia) — **do ustalenia na starcie pracy nad
funkcjonalnością**, patrz `PRZEKAZANIE.md`.
