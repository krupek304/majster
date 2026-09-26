// Warstwa danych - IndexedDB. Wszystko lokalnie na urządzeniu, zero sieci.
// Pole `dodane_przez` w pozycjach kosztorysu wskazuje na uzytkownicy.id -
// dziś zawsze jeden, domyślny użytkownik, ale schemat jest gotowy na dodanie kolejnych kont później.

const DB_NAME = 'majster-db';
const DB_VERSION = 6;
const DOMYSLNY_UZYTKOWNIK_ID = 'ja';

// Pełna kolejność etapów wykończenia mieszkania (od przygotowania po odbiór).
// Każda pozycja to od razu gotowy wpis cennika: nazwa + jednostka + sugerowana
// stawka rynkowa (Polska, średnia krajowa, sama robocizna bez materiału).
// Stawki zbadane w internecie 2026-09-26 (murator.pl, kb.pl, cenauslug.pl,
// budowalka.pl, adrem.org.pl i in. - patrz PRZEKAZANIE.md po źródła i zakresy).
// `stawka: 0` = czynność organizacyjna/zbyt zróżnicowana, żeby mieć jedną
// sensowną stawkę rynkową - do wypełnienia przez fachowca, nie zgadujemy.
const DOMYSLNY_CENNIK = [
  // Przygotowanie i planowanie
  { kategoria: 'Przygotowanie i planowanie', nazwa: 'Opracowanie projektu wnętrza (układ ścian, punkty instalacyjne, dobór materiałów)', jednostka: 'usł.', stawka: 0 },
  { kategoria: 'Przygotowanie i planowanie', nazwa: 'Sporządzenie harmonogramu i kosztorysu prac', jednostka: 'usł.', stawka: 0 },
  { kategoria: 'Przygotowanie i planowanie', nazwa: 'Zakup i dostawa materiałów budowlanych oraz wykończeniowych', jednostka: 'usł.', stawka: 0 },
  { kategoria: 'Przygotowanie i planowanie', nazwa: 'Zabezpieczenie mieszkania przed pyłem i uszkodzeniami (folie, kartony)', jednostka: 'usł.', stawka: 0 },
  // Prace rozbiórkowe i konstrukcyjne
  { kategoria: 'Prace rozbiórkowe i konstrukcyjne', nazwa: 'Wyburzanie ścianek działowych lub ich fragmentów', jednostka: 'm2', stawka: 90 },
  { kategoria: 'Prace rozbiórkowe i konstrukcyjne', nazwa: 'Demontaż starych instalacji, armatury, ościeżnic, podłóg, płytek', jednostka: 'usł.', stawka: 0 },
  { kategoria: 'Prace rozbiórkowe i konstrukcyjne', nazwa: 'Stawianie nowych ścianek działowych (bloczki, płyty gipsowo-kartonowe)', jednostka: 'm2', stawka: 100 },
  { kategoria: 'Prace rozbiórkowe i konstrukcyjne', nazwa: 'Wykucie bruzd pod instalacje elektryczne i hydrauliczne', jednostka: 'mb', stawka: 27 },
  // Instalacje wewnętrzne (stan surowy)
  { kategoria: 'Instalacje wewnętrzne (stan surowy)', nazwa: 'Rozprowadzenie instalacji elektrycznej (przewody, puszki, rozdzielnia)', jednostka: 'pkt', stawka: 130 },
  { kategoria: 'Instalacje wewnętrzne (stan surowy)', nazwa: 'Rozprowadzenie instalacji hydraulicznej (woda, kanalizacja, przyłącza do AGD)', jednostka: 'pkt', stawka: 300 },
  { kategoria: 'Instalacje wewnętrzne (stan surowy)', nazwa: 'Montaż instalacji wentylacyjnej lub rekuperacji (opcjonalnie)', jednostka: 'usł.', stawka: 0 },
  { kategoria: 'Instalacje wewnętrzne (stan surowy)', nazwa: 'Montaż instalacji ogrzewania (grzejniki, ogrzewanie podłogowe)', jednostka: 'm2', stawka: 70 },
  { kategoria: 'Instalacje wewnętrzne (stan surowy)', nazwa: 'Montaż stelaży podtynkowych (WC, umywalki)', jednostka: 'szt.', stawka: 450 },
  // Prace tynkarskie i wylewki
  { kategoria: 'Prace tynkarskie i wylewki', nazwa: 'Tynkowanie ścian i sufitów (tynki cementowo-wapienne lub gipsowe)', jednostka: 'm2', stawka: 44 },
  { kategoria: 'Prace tynkarskie i wylewki', nazwa: 'Osadzanie ościeżnic drzwiowych (futryn) w otworach', jednostka: 'szt.', stawka: 100 },
  { kategoria: 'Prace tynkarskie i wylewki', nazwa: 'Wykonanie wylewek podłogowych (tradycyjne lub samopoziomujące)', jednostka: 'm2', stawka: 40 },
  { kategoria: 'Prace tynkarskie i wylewki', nazwa: 'Gruntowanie podłoży przed dalszymi pracami', jednostka: 'm2', stawka: 7 },
  // Zabudowy z płyt gipsowo-kartonowych (GK)
  { kategoria: 'Zabudowy z płyt gipsowo-kartonowych (GK)', nazwa: 'Budowa sufitów podwieszanych z oświetleniem punktowym', jednostka: 'm2', stawka: 120 },
  { kategoria: 'Zabudowy z płyt gipsowo-kartonowych (GK)', nazwa: 'Zabudowa instalacji (np. rury, skrzynki)', jednostka: 'mb', stawka: 70 },
  { kategoria: 'Zabudowy z płyt gipsowo-kartonowych (GK)', nazwa: 'Wykonanie wnęk, ścianek ozdobnych, obudów kominków', jednostka: 'm2', stawka: 100 },
  { kategoria: 'Zabudowy z płyt gipsowo-kartonowych (GK)', nazwa: 'Szpachlowanie połączeń płyt GK', jednostka: 'm2', stawka: 15 },
  // Prace glazurnicze i terakota
  { kategoria: 'Prace glazurnicze i terakota', nazwa: 'Hydroizolacja łazienki, kuchni i innych stref mokrych (folia w płynie, mata uszczelniająca)', jednostka: 'm2', stawka: 44 },
  { kategoria: 'Prace glazurnicze i terakota', nazwa: 'Układanie płytek ceramicznych na ścianach (łazienka, kuchnia, przedpokój)', jednostka: 'm2', stawka: 100 },
  { kategoria: 'Prace glazurnicze i terakota', nazwa: 'Układanie płytek podłogowych (terakota, gres)', jednostka: 'm2', stawka: 110 },
  { kategoria: 'Prace glazurnicze i terakota', nazwa: 'Wykonanie obróbek, listew przypodłogowych z płytek, narożników', jednostka: 'mb', stawka: 30 },
  { kategoria: 'Prace glazurnicze i terakota', nazwa: 'Impregnacja i czyszczenie płytek po ułożeniu', jednostka: 'm2', stawka: 12 },
  // Gładzie i przygotowanie ścian do malowania
  { kategoria: 'Gładzie i przygotowanie ścian do malowania', nazwa: 'Nakładanie gładzi gipsowych na ściany i sufity', jednostka: 'm2', stawka: 50 },
  { kategoria: 'Gładzie i przygotowanie ścian do malowania', nazwa: 'Szlifowanie gładzi do uzyskania idealnej gładkości', jednostka: 'm2', stawka: 10 },
  { kategoria: 'Gładzie i przygotowanie ścian do malowania', nazwa: 'Gruntowanie ścian przed malowaniem', jednostka: 'm2', stawka: 7 },
  { kategoria: 'Gładzie i przygotowanie ścian do malowania', nazwa: 'Pierwsze malowanie (warstwa podkładowa, tzw. "białe malowanie")', jednostka: 'm2', stawka: 10 },
  // Podłogi
  { kategoria: 'Podłogi', nazwa: 'Układanie paneli podłogowych', jednostka: 'm2', stawka: 44 },
  { kategoria: 'Podłogi', nazwa: 'Montaż podłóg drewnianych (deski, parkiet, mozaika)', jednostka: 'm2', stawka: 60 },
  { kategoria: 'Podłogi', nazwa: 'Układanie wykładzin dywanowych lub winylowych', jednostka: 'm2', stawka: 45 },
  { kategoria: 'Podłogi', nazwa: 'Montaż listew przypodłogowych (cokołów)', jednostka: 'mb', stawka: 26 },
  { kategoria: 'Podłogi', nazwa: 'Cyklinowanie i lakierowanie podłóg drewnianych (w razie potrzeby)', jednostka: 'm2', stawka: 45 },
  // Stolarka drzwiowa i okienna
  { kategoria: 'Stolarka drzwiowa i okienna', nazwa: 'Montaż drzwi wewnętrznych (skrzydła, zawiasy, klamki)', jednostka: 'szt.', stawka: 350 },
  { kategoria: 'Stolarka drzwiowa i okienna', nazwa: 'Regulacja drzwi i zamków', jednostka: 'szt.', stawka: 80 },
  { kategoria: 'Stolarka drzwiowa i okienna', nazwa: 'Montaż parapetów wewnętrznych', jednostka: 'mb', stawka: 93 },
  { kategoria: 'Stolarka drzwiowa i okienna', nazwa: 'Ewentualna wymiana lub regulacja okien (jeśli w zakresie)', jednostka: 'usł.', stawka: 0 },
  // Malowanie i wykończenie ścian
  { kategoria: 'Malowanie i wykończenie ścian', nazwa: 'Malowanie końcowe ścian i sufitów (2-3 warstwy farby)', jednostka: 'm2', stawka: 22 },
  { kategoria: 'Malowanie i wykończenie ścian', nazwa: 'Klejenie tapet (alternatywa dla malowania)', jednostka: 'm2', stawka: 45 },
  { kategoria: 'Malowanie i wykończenie ścian', nazwa: 'Montaż listew ozdobnych, gzymsów, cokołów dekoracyjnych', jednostka: 'mb', stawka: 20 },
  // Biały montaż i osprzęt
  { kategoria: 'Biały montaż i osprzęt', nazwa: 'Montaż armatury łazienkowej (baterie, prysznice, deszczownice)', jednostka: 'szt.', stawka: 200 },
  { kategoria: 'Biały montaż i osprzęt', nazwa: 'Montaż ceramiki sanitarnej (umywalki, WC, bidety, wanny, kabiny)', jednostka: 'szt.', stawka: 250 },
  { kategoria: 'Biały montaż i osprzęt', nazwa: 'Montaż oświetlenia (lampy, plafony, taśmy LED)', jednostka: 'szt.', stawka: 60 },
  { kategoria: 'Biały montaż i osprzęt', nazwa: 'Montaż osprzętu elektrycznego (gniazdka, włączniki, ramki)', jednostka: 'szt.', stawka: 50 },
  { kategoria: 'Biały montaż i osprzęt', nazwa: 'Montaż grzejników i głowic termostatycznych', jednostka: 'szt.', stawka: 200 },
  { kategoria: 'Biały montaż i osprzęt', nazwa: 'Montaż mebli łazienkowych i kuchennych (szafki, blaty)', jednostka: 'szt.', stawka: 300 },
  // Kuchnia i AGD
  { kategoria: 'Kuchnia i AGD', nazwa: 'Montaż zabudowy kuchennej (szafki górne i dolne)', jednostka: 'mb', stawka: 450 },
  { kategoria: 'Kuchnia i AGD', nazwa: 'Podłączenie zlewu i baterii kuchennej', jednostka: 'usł.', stawka: 200 },
  { kategoria: 'Kuchnia i AGD', nazwa: 'Montaż i podłączenie sprzętu AGD (lodówka, piekarnik, płyta, zmywarka, okap)', jednostka: 'szt.', stawka: 100 },
  // Sprzątanie i odbiór
  { kategoria: 'Sprzątanie i odbiór', nazwa: 'Usunięcie zabezpieczeń (folii, kartonów)', jednostka: 'usł.', stawka: 0 },
  { kategoria: 'Sprzątanie i odbiór', nazwa: 'Dokładne sprzątanie mieszkania po wszystkich pracach', jednostka: 'm2', stawka: 15 },
  { kategoria: 'Sprzątanie i odbiór', nazwa: 'Wywóz gruzu i odpadów budowlanych', jednostka: 'kpl.', stawka: 700 },
  { kategoria: 'Sprzątanie i odbiór', nazwa: 'Odbiór techniczny z inwestorem (sprawdzenie jakości prac)', jednostka: 'usł.', stawka: 0 },
  // Prace dodatkowe i opcjonalne
  { kategoria: 'Prace dodatkowe i opcjonalne', nazwa: 'Montaż klimatyzacji', jednostka: 'kpl.', stawka: 1500 },
  { kategoria: 'Prace dodatkowe i opcjonalne', nazwa: 'Montaż rolet, żaluzji, firan i zasłon', jednostka: 'szt.', stawka: 150 },
  { kategoria: 'Prace dodatkowe i opcjonalne', nazwa: 'Montaż luster, półek, wieszaków, akcesoriów łazienkowych', jednostka: 'szt.', stawka: 40 },
  { kategoria: 'Prace dodatkowe i opcjonalne', nazwa: 'Dekory ścienne (obrazy, naklejki, fototapety)', jednostka: 'usł.', stawka: 0 },
  { kategoria: 'Prace dodatkowe i opcjonalne', nazwa: 'Montaż systemów Smart Home (czujniki, sterowanie oświetleniem)', jednostka: 'usł.', stawka: 0 },
];
const DOMYSLNE_KATEGORIE = [...new Set(DOMYSLNY_CENNIK.map((p) => p.kategoria))];

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('projekty')) {
        db.createObjectStore('projekty', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cennik')) {
        db.createObjectStore('cennik', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pozycje')) {
        const store = db.createObjectStore('pozycje', { keyPath: 'id' });
        store.createIndex('projekt_id', 'projekt_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('kategorie')) {
        db.createObjectStore('kategorie', { keyPath: 'id' });
      }
      if (db.objectStoreNames.contains('podkategorie')) {
        // Zastąpione przez wpisy w 'cennik' (v3) - jednostka i stawka od razu
        // przy typowej czynności, jeden system zamiast dwóch równoległych.
        db.deleteObjectStore('podkategorie');
      }
      if (!db.objectStoreNames.contains('uzytkownicy')) {
        db.createObjectStore('uzytkownicy', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('platnosci')) {
        const store = db.createObjectStore('platnosci', { keyPath: 'id' });
        store.createIndex('projekt_id', 'projekt_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('ustawienia')) {
        db.createObjectStore('ustawienia', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('powiadomienia')) {
        // Powiadomienia "w aplikacji" (nie systemowe/push - appka nie ma
        // backendu do wysyłki). Generowane lokalnie na podstawie dat projektów
        // przy każdym uruchomieniu (patrz sprawdzPowiadomieniaProjektow w app.js).
        const store = db.createObjectStore('powiadomienia', { keyPath: 'id' });
        store.createIndex('projekt_id', 'projekt_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('zdjecia')) {
        // Zdjęcia "przed/po" dopięte do konkretnej pozycji kosztorysu - blob
        // trzymany bezpośrednio w IndexedDB (nie w localStorage, za mały limit).
        // Zostają TYLKO na tym urządzeniu - nie ma synchronizacji ani wysyłki nigdzie.
        const store = db.createObjectStore('zdjecia', { keyPath: 'id' });
        store.createIndex('pozycja_id', 'pozycja_id', { unique: false });
      }
    };

    req.onsuccess = async (event) => {
      const db = event.target.result;
      await zapewnijDaneStartowe(db);
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function zapewnijDaneStartowe(db) {
  // Uzupełnia brakujące domyślne kategorie PO NAZWIE, nie tylko przy pustej
  // bazie - żeby aktualizacja listy kategorii (np. ta z 2026-09-26) dotarła
  // też do baz zasianych wcześniejszą wersją, bez kasowania własnych kategorii
  // użytkownika ani duplikowania tych, które już tam są.
  const istniejaceKategorie = await getAll(db, 'kategorie');
  const istniejaceNazwy = new Set(istniejaceKategorie.map((k) => k.nazwa));
  const brakujaceKategorie = DOMYSLNE_KATEGORIE.filter((nazwa) => !istniejaceNazwy.has(nazwa));
  if (brakujaceKategorie.length > 0) {
    let kolejnosc = istniejaceKategorie.length;
    await withStore(db, 'kategorie', 'readwrite', (store) => {
      brakujaceKategorie.forEach((nazwa) => {
        store.put({ id: cryptoId(), nazwa, kolejnosc: kolejnosc++ });
      });
    });
  }

  // Uzupełnia brakujące domyślne pozycje cennika PO PARZE kategoria+nazwa -
  // ten sam mechanizm co przy kategoriach, żeby aktualizacja stawek dotarła
  // do już zasianych baz bez nadpisywania własnoręcznie zmienionych cen
  // użytkownika ani duplikowania istniejących wpisów.
  const istniejacyCennik = await getAll(db, 'cennik');
  const istniejaceParyKatNazwa = new Set(istniejacyCennik.map((p) => p.kategoria + '\u0001' + p.nazwa));
  const brakujaceWCenniku = DOMYSLNY_CENNIK.filter(
    (p) => !istniejaceParyKatNazwa.has(p.kategoria + '\u0001' + p.nazwa)
  );
  if (brakujaceWCenniku.length > 0) {
    await withStore(db, 'cennik', 'readwrite', (store) => {
      brakujaceWCenniku.forEach((p) => {
        store.put({ id: cryptoId(), kategoria: p.kategoria, nazwa: p.nazwa, jednostka: p.jednostka, stawka: p.stawka });
      });
    });
  }

  const uzytkownicy = await getAll(db, 'uzytkownicy');
  if (uzytkownicy.length === 0) {
    await withStore(db, 'uzytkownicy', 'readwrite', (store) => {
      store.put({ id: DOMYSLNY_UZYTKOWNIK_ID, nazwa: 'Ja' });
    });
  }
}

export function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// "Dzisiaj" jako RRRR-MM-DD w czasie LOKALNYM - NIE new Date().toISOString(),
// bo ta konwertuje na UTC i potrafi cofnąć datę o dzień w nocy przy dodatniej
// strefie czasowej. Ten sam helper co w app.js (dzisiajYMD) - osobno, bo to
// dwa niezależne moduły bez wspólnego pliku narzędziowego dla jednej funkcji.
function dzisiajYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function withStore(db, storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function getAll(db, storeName, indexName, query) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = indexName ? tx.objectStore(storeName).index(indexName) : tx.objectStore(storeName);
    const req = query !== undefined ? store.getAll(query) : store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Pojedynczy rekord po kluczu głównym - do "usuń, ale zapamiętaj co, żeby dało
// się cofnąć" (funkcje usunXxx poniżej pobierają nim rekord PRZED skasowaniem).
function getOne(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Projekty ----------

export async function pobierzProjekty() {
  const db = await openDB();
  const projekty = await getAll(db, 'projekty');
  return projekty.sort((a, b) => b.data_utworzenia.localeCompare(a.data_utworzenia));
}

// `dataRozpoczecia` (YYYY-MM-DD, może być w przyszłości) - kiedy realnie
// startują prace. Osobne pole od `data_utworzenia` (kiedy zapisano rekord
// w appce - to zawsze "teraz", do sortowania "najnowsze" jako fallback).
export async function dodajProjekt({ nazwa, klient, dataRozpoczecia }) {
  const db = await openDB();
  const projekt = {
    id: cryptoId(),
    nazwa: nazwa.trim(),
    klient: (klient || '').trim(),
    status: 'wycena',
    data_utworzenia: new Date().toISOString(),
    data_rozpoczecia: dataRozpoczecia || dzisiajYMD(),
    data_zakonczenia: null,
  };
  await withStore(db, 'projekty', 'readwrite', (store) => store.put(projekt));
  return projekt;
}

export async function aktualizujProjekt(projekt) {
  const db = await openDB();
  await withStore(db, 'projekty', 'readwrite', (store) => store.put(projekt));
}

// Kopiuje projekt razem z jego pozycjami kosztorysu (nowe id, nowa data) -
// NIE kopiuje płatności (to historia konkretnego zlecenia, nie szablonu).
export async function duplikujProjekt(projektId, nowaNazwa) {
  const db = await openDB();
  const projekty = await getAll(db, 'projekty');
  const oryginal = projekty.find((p) => p.id === projektId);
  if (!oryginal) throw new Error('Projekt do skopiowania nie istnieje');

  const nowyProjekt = {
    id: cryptoId(),
    nazwa: nowaNazwa.trim(),
    klient: oryginal.klient,
    status: 'wycena',
    data_utworzenia: new Date().toISOString(),
  };
  const pozycje = await getAll(db, 'pozycje', 'projekt_id', projektId);
  const teraz = new Date().toISOString();

  await withStore(db, 'projekty', 'readwrite', (store) => store.put(nowyProjekt));
  await withStore(db, 'pozycje', 'readwrite', (store) => {
    pozycje.forEach((p) => {
      store.put({ ...p, id: cryptoId(), projekt_id: nowyProjekt.id, data: teraz });
    });
  });
  return { projekt: nowyProjekt, liczbaPozycji: pozycje.length };
}

// Zwraca skasowane dane (projekt, pozycje, płatności, zdjęcia) - do "Cofnij"
// w UI (patrz przywrocProjekt). Kasuje też zdjęcia dopięte do pozycji tego
// projektu, żeby nie zostawiać sierocych blobów w magazynie 'zdjecia'.
export async function usunProjekt(projektId) {
  const db = await openDB();
  const [projekt, pozycje, platnosci, wszystkieZdjecia] = await Promise.all([
    getOne(db, 'projekty', projektId),
    getAll(db, 'pozycje', 'projekt_id', projektId),
    getAll(db, 'platnosci', 'projekt_id', projektId),
    getAll(db, 'zdjecia'),
  ]);
  const idPozycji = new Set(pozycje.map((p) => p.id));
  const zdjecia = wszystkieZdjecia.filter((z) => idPozycji.has(z.pozycja_id));
  await withStore(db, 'zdjecia', 'readwrite', (store) => {
    zdjecia.forEach((z) => store.delete(z.id));
  });
  await withStore(db, 'pozycje', 'readwrite', (store) => {
    pozycje.forEach((p) => store.delete(p.id));
  });
  await withStore(db, 'platnosci', 'readwrite', (store) => {
    platnosci.forEach((p) => store.delete(p.id));
  });
  await withStore(db, 'projekty', 'readwrite', (store) => store.delete(projektId));
  return { projekt, pozycje, platnosci, zdjecia };
}

// Cofnięcie usunięcia całego projektu - przywraca dokładnie to, co zwrócił usunProjekt.
export async function przywrocProjekt({ projekt, pozycje, platnosci, zdjecia }) {
  const db = await openDB();
  await withStore(db, 'projekty', 'readwrite', (store) => store.put(projekt));
  await withStore(db, 'pozycje', 'readwrite', (store) => {
    pozycje.forEach((p) => store.put(p));
  });
  await withStore(db, 'platnosci', 'readwrite', (store) => {
    platnosci.forEach((p) => store.put(p));
  });
  if (zdjecia?.length) {
    await withStore(db, 'zdjecia', 'readwrite', (store) => {
      zdjecia.forEach((z) => store.put(z));
    });
  }
}

// ---------- Kategorie ----------

export async function pobierzKategorie() {
  const db = await openDB();
  const kategorie = await getAll(db, 'kategorie');
  return kategorie.sort((a, b) => a.kolejnosc - b.kolejnosc);
}

export async function dodajKategorie(nazwa) {
  const db = await openDB();
  const istniejace = await pobierzKategorie();
  // Max+1, nie .length - po usunięciu kategorii (usunKategorieRazemZCennikiem)
  // w numeracji `kolejnosc` zostają luki, więc .length mógłby trafić na już
  // zajętą wartość (np. kategorie 0,1,3,4 mają length=4, a 4 jest zajęte).
  const kolejnosc = istniejace.reduce((max, k) => Math.max(max, k.kolejnosc), -1) + 1;
  const kategoria = { id: cryptoId(), nazwa: nazwa.trim(), kolejnosc, ukryta: false };
  await withStore(db, 'kategorie', 'readwrite', (store) => store.put(kategoria));
  return kategoria;
}

export async function aktualizujKategorie(kategoria) {
  const db = await openDB();
  await withStore(db, 'kategorie', 'readwrite', (store) => store.put(kategoria));
}

// Usuwa kategorię NA STAŁE razem z jej pozycjami w cenniku (decyzja
// użytkownika 2026-09-26: jedno działanie, bez osobnego kasowania pozycji).
// Pozycje kosztorysu w już zapisanych projektach NIE są usuwane ani
// blokujące - zachowują nazwę kategorii jako zwykły tekst i dalej liczą się
// poprawnie (ostrzeżenie z liczbą pokazuje się w UI przed potwierdzeniem).
export async function usunKategorieRazemZCennikiem(kategoriaId, nazwaKategorii) {
  const db = await openDB();
  const cennikDoUsuniecia = (await getAll(db, 'cennik')).filter((c) => c.kategoria === nazwaKategorii);
  await withStore(db, 'cennik', 'readwrite', (store) => {
    cennikDoUsuniecia.forEach((c) => store.delete(c.id));
  });
  await withStore(db, 'kategorie', 'readwrite', (store) => store.delete(kategoriaId));
  return { usunietoZCennika: cennikDoUsuniecia.length };
}

// Przywraca fabryczny cennik i listę kategorii - kasuje WSZYSTKIE kategorie
// i pozycje cennika (także własne, dodane przez użytkownika, i zmienione
// stawki) i zasiewa od nowa z DOMYSLNY_CENNIK/DOMYSLNE_KATEGORIE. Projekty,
// kosztorysy, płatności i dane firmy zostają nietknięte - kategoria zapisana
// przy pozycji kosztorysu to zwykły tekst, nie referencja do id kategorii
// (patrz komentarz w usunKategorieRazemZCennikiem), więc reset tu jej nie rusza.
export async function przywrocDomyslnyCennik() {
  const db = await openDB();
  const [stareKategorie, staryCennik] = await Promise.all([getAll(db, 'kategorie'), getAll(db, 'cennik')]);
  await withStore(db, 'kategorie', 'readwrite', (store) => {
    stareKategorie.forEach((k) => store.delete(k.id));
  });
  await withStore(db, 'cennik', 'readwrite', (store) => {
    staryCennik.forEach((c) => store.delete(c.id));
  });
  await withStore(db, 'kategorie', 'readwrite', (store) => {
    DOMYSLNE_KATEGORIE.forEach((nazwa, kolejnosc) => {
      store.put({ id: cryptoId(), nazwa, kolejnosc, ukryta: false });
    });
  });
  await withStore(db, 'cennik', 'readwrite', (store) => {
    DOMYSLNY_CENNIK.forEach((p) => {
      store.put({ id: cryptoId(), kategoria: p.kategoria, nazwa: p.nazwa, jednostka: p.jednostka, stawka: p.stawka });
    });
  });
  return { liczbaKategorii: DOMYSLNE_KATEGORIE.length, liczbaCennika: DOMYSLNY_CENNIK.length };
}

// Do liczenia, ile ZAPISANYCH pozycji kosztorysu (we wszystkich projektach)
// użyje danej kategorii - tylko do ostrzeżenia w UI, nic nie zmienia.
export async function pobierzWszystkiePozycjeKosztorysu() {
  const db = await openDB();
  return getAll(db, 'pozycje');
}

// ---------- Szablony pomieszczeń (gotowe zestawy typowych czynności) ----------
// Odwołują się do NAZW pozycji cennika (nie ID), więc działają nawet jeśli
// użytkownik dodał domyślny cennik przy innej instalacji - jeśli jakiejś
// nazwy nie ma (np. usunięta ręcznie), ta jedna pozycja jest po prostu
// pomijana, reszta szablonu i tak się doda.
export const SZABLONY_POMIESZCZEN = {
  'Łazienka': [
    'Hydroizolacja łazienki, kuchni i innych stref mokrych (folia w płynie, mata uszczelniająca)',
    'Układanie płytek ceramicznych na ścianach (łazienka, kuchnia, przedpokój)',
    'Układanie płytek podłogowych (terakota, gres)',
    'Montaż stelaży podtynkowych (WC, umywalki)',
    'Montaż armatury łazienkowej (baterie, prysznice, deszczownice)',
    'Montaż ceramiki sanitarnej (umywalki, WC, bidety, wanny, kabiny)',
  ],
  'Kuchnia': [
    'Układanie płytek ceramicznych na ścianach (łazienka, kuchnia, przedpokój)',
    'Układanie płytek podłogowych (terakota, gres)',
    'Montaż zabudowy kuchennej (szafki górne i dolne)',
    'Podłączenie zlewu i baterii kuchennej',
    'Montaż i podłączenie sprzętu AGD (lodówka, piekarnik, płyta, zmywarka, okap)',
    'Montaż osprzętu elektrycznego (gniazdka, włączniki, ramki)',
  ],
  'Pokój / Salon': [
    'Nakładanie gładzi gipsowych na ściany i sufity',
    'Malowanie końcowe ścian i sufitów (2-3 warstwy farby)',
    'Układanie paneli podłogowych',
    'Montaż listew przypodłogowych (cokołów)',
    'Montaż osprzętu elektrycznego (gniazdka, włączniki, ramki)',
    'Montaż oświetlenia (lampy, plafony, taśmy LED)',
  ],
  'Przedpokój / Hol': [
    'Nakładanie gładzi gipsowych na ściany i sufity',
    'Malowanie końcowe ścian i sufitów (2-3 warstwy farby)',
    'Układanie płytek podłogowych (terakota, gres)',
    'Montaż listew przypodłogowych (cokołów)',
  ],
};

export function pobierzNazwySzablonowPomieszczen() {
  return Object.keys(SZABLONY_POMIESZCZEN);
}

// Zamienia nazwy czynności z szablonu na aktualne pozycje cennika (z
// aktualną, ewentualnie już poprawioną przez fachowca stawką).
export async function pobierzPozycjeSzablonu(nazwaSzablonu) {
  const cennik = await pobierzCennik();
  const nazwyCzynnosci = SZABLONY_POMIESZCZEN[nazwaSzablonu] || [];
  return nazwyCzynnosci
    .map((nazwa) => cennik.find((c) => c.nazwa === nazwa))
    .filter(Boolean);
}

// Dodaje od razu kilka pozycji kosztorysu (np. cały szablon pomieszczenia)
// w jednej transakcji. Ilość zawsze startuje od 1 - fachowiec poprawia
// realną ilość dla każdej pozycji z osobna po dodaniu (edycja jednym stuknięciem).
export async function dodajWielePozycjiKosztorysu(projektId, listaPozycjiCennika, pomieszczenie) {
  const db = await openDB();
  // Znaczniki czasu +1ms na pozycję (nie identyczny czas dla wszystkich) -
  // `pobierzPozycjeProjektu` sortuje po `data`, a przy remisach o kolejności
  // decyduje klucz główny (losowe UUID) z IndexedDB, co tasowało kolejność
  // pozycji z szablonu przy odczycie (zweryfikowane empirycznie przed poprawką).
  const bazowyCzas = Date.now();
  const zapisane = listaPozycjiCennika.map((p, i) => ({
    id: cryptoId(),
    projekt_id: projektId,
    nazwa: p.nazwa,
    kategoria: p.kategoria,
    jednostka: p.jednostka,
    ilosc: 1,
    stawka: p.stawka,
    pomieszczenie: (pomieszczenie || '').trim(),
    dodane_przez: DOMYSLNY_UZYTKOWNIK_ID,
    data: new Date(bazowyCzas + i).toISOString(),
  }));
  await withStore(db, 'pozycje', 'readwrite', (store) => {
    zapisane.forEach((p) => store.put(p));
  });
  return zapisane;
}

// ---------- Kopia zapasowa (eksport/import całej bazy) ----------
// Import jest ADDYTYWNY (put po id) - nadpisuje rekordy o tym samym id,
// dopisuje nowe, ale NIE kasuje niczego, czego nie ma w pliku. Bezpieczny
// domyślny wybór: przywrócenie kopii na czystym telefonie działa tak samo
// jak "doklejenie" starszej kopii do już używanej instalacji.
// Celowo BEZ 'zdjecia' - to blob'y (mogą być duże), a eksport/import przechodzi
// przez JSON.stringify, który by je albo pominął, albo wymagał zamiany na
// base64 i mocno napuchł plik kopii. Zdjęcia zostają tylko lokalnie na
// urządzeniu i nie są objęte kopią zapasową - do rozważenia osobno, jeśli
// będzie taka potrzeba.
const WSZYSTKIE_STORY_KOPII = ['projekty', 'cennik', 'pozycje', 'kategorie', 'uzytkownicy', 'platnosci', 'ustawienia'];

export async function eksportujCalaBaze() {
  const db = await openDB();
  const dane = {};
  for (const nazwaStore of WSZYSTKIE_STORY_KOPII) {
    dane[nazwaStore] = await getAll(db, nazwaStore);
  }
  return { aplikacja: 'O!Majster', wersjaBazy: DB_VERSION, eksportowano: new Date().toISOString(), dane };
}

export async function importujCalaBaze(kopia) {
  if (!kopia || typeof kopia !== 'object' || !kopia.dane) {
    throw new Error('To nie wygląda na plik kopii zapasowej O!Majster.');
  }
  const db = await openDB();
  const wynik = {};

  // Kategorie i cennik: dopasuj po NAZWIE (kategoria: nazwa; cennik:
  // kategoria+nazwa) i zaktualizuj istniejący rekord zamiast tworzyć
  // duplikat z innym ID. Inaczej przywrócenie kopii na już zasianej (świeżej)
  // instalacji podwoiłoby domyślne 60 pozycji cennika / 14 kategorii - a przy
  // okazji poprawnie przywraca stawki, które fachowiec sam sobie zmienił.
  const importowaneKategorie = Array.isArray(kopia.dane.kategorie) ? kopia.dane.kategorie : [];
  if (importowaneKategorie.length > 0) {
    const istniejace = await getAll(db, 'kategorie');
    const mapaPoNazwie = new Map(istniejace.map((k) => [k.nazwa, k]));
    await withStore(db, 'kategorie', 'readwrite', (store) => {
      importowaneKategorie.forEach((k) => {
        const juzIstnieje = mapaPoNazwie.get(k.nazwa);
        store.put(juzIstnieje ? { ...juzIstnieje, ukryta: k.ukryta, kolejnosc: k.kolejnosc } : k);
      });
    });
  }
  wynik.kategorie = importowaneKategorie.length;

  const importowanyCennik = Array.isArray(kopia.dane.cennik) ? kopia.dane.cennik : [];
  if (importowanyCennik.length > 0) {
    const istniejace = await getAll(db, 'cennik');
    const mapaPoKluczu = new Map(istniejace.map((c) => [c.kategoria + '\u0001' + c.nazwa, c]));
    await withStore(db, 'cennik', 'readwrite', (store) => {
      importowanyCennik.forEach((c) => {
        const juzIstnieje = mapaPoKluczu.get(c.kategoria + '\u0001' + c.nazwa);
        store.put(juzIstnieje ? { ...juzIstnieje, jednostka: c.jednostka, stawka: c.stawka } : c);
      });
    });
  }
  wynik.cennik = importowanyCennik.length;

  // Reszta (projekty, pozycje, płatności, ustawienia): dane specyficzne dla
  // użytkownika, bez domyślnego seeda z którym mogłyby kolidować - put po ID
  // wprost, żeby zachować powiązania (pozycje.projekt_id -> projekty.id z tej
  // samej kopii).
  for (const nazwaStore of ['projekty', 'pozycje', 'platnosci', 'ustawienia']) {
    const rekordy = Array.isArray(kopia.dane[nazwaStore]) ? kopia.dane[nazwaStore] : [];
    if (rekordy.length === 0) {
      wynik[nazwaStore] = 0;
      continue;
    }
    await withStore(db, nazwaStore, 'readwrite', (store) => {
      rekordy.forEach((r) => store.put(r));
    });
    wynik[nazwaStore] = rekordy.length;
  }
  return wynik;
}

// ---------- Cennik ----------

export async function pobierzCennik() {
  const db = await openDB();
  const [cennik, kategorie] = await Promise.all([getAll(db, 'cennik'), pobierzKategorie()]);
  const kolejnoscKategorii = new Map(kategorie.map((k) => [k.nazwa, k.kolejnosc]));
  const rangaNieznanej = kategorie.length;
  return cennik.sort((a, b) => {
    const ka = kolejnoscKategorii.has(a.kategoria) ? kolejnoscKategorii.get(a.kategoria) : rangaNieznanej;
    const kb = kolejnoscKategorii.has(b.kategoria) ? kolejnoscKategorii.get(b.kategoria) : rangaNieznanej;
    if (ka !== kb) return ka - kb;
    return a.nazwa.localeCompare(b.nazwa, 'pl');
  });
}

export async function dodajPozycjeCennika({ nazwa, kategoria, jednostka, stawka }) {
  const db = await openDB();
  const pozycja = {
    id: cryptoId(),
    nazwa: nazwa.trim(),
    kategoria,
    jednostka: jednostka.trim(),
    stawka: Number(stawka),
  };
  await withStore(db, 'cennik', 'readwrite', (store) => store.put(pozycja));
  return pozycja;
}

export async function aktualizujPozycjeCennika(pozycja) {
  const db = await openDB();
  await withStore(db, 'cennik', 'readwrite', (store) => store.put(pozycja));
}

export async function usunPozycjeCennika(id) {
  const db = await openDB();
  const pozycja = await getOne(db, 'cennik', id);
  await withStore(db, 'cennik', 'readwrite', (store) => store.delete(id));
  return pozycja;
}

export async function przywrocPozycjeCennika(pozycja) {
  const db = await openDB();
  await withStore(db, 'cennik', 'readwrite', (store) => store.put(pozycja));
}

// ---------- Pozycje kosztorysu ----------

export async function pobierzPozycjeProjektu(projektId) {
  const db = await openDB();
  const pozycje = await getAll(db, 'pozycje', 'projekt_id', projektId);
  return pozycje.sort((a, b) => a.data.localeCompare(b.data));
}

export async function dodajPozycjeKosztorysu(projektId, { nazwa, kategoria, jednostka, ilosc, stawka, pomieszczenie }) {
  const db = await openDB();
  const pozycja = {
    id: cryptoId(),
    projekt_id: projektId,
    nazwa: nazwa.trim(),
    kategoria,
    jednostka: jednostka.trim(),
    ilosc: Number(ilosc),
    stawka: Number(stawka),
    pomieszczenie: (pomieszczenie || '').trim(),
    dodane_przez: DOMYSLNY_UZYTKOWNIK_ID,
    data: new Date().toISOString(),
  };
  await withStore(db, 'pozycje', 'readwrite', (store) => store.put(pozycja));
  return pozycja;
}

export async function aktualizujPozycjeKosztorysu(pozycja) {
  const db = await openDB();
  await withStore(db, 'pozycje', 'readwrite', (store) => store.put(pozycja));
}

export async function usunPozycjeKosztorysu(id) {
  const db = await openDB();
  const [pozycja, zdjecia] = await Promise.all([
    getOne(db, 'pozycje', id),
    getAll(db, 'zdjecia', 'pozycja_id', id),
  ]);
  await withStore(db, 'zdjecia', 'readwrite', (store) => {
    zdjecia.forEach((z) => store.delete(z.id));
  });
  await withStore(db, 'pozycje', 'readwrite', (store) => store.delete(id));
  return { pozycja, zdjecia };
}

export async function przywrocPozycjeKosztorysu({ pozycja, zdjecia }) {
  const db = await openDB();
  await withStore(db, 'pozycje', 'readwrite', (store) => store.put(pozycja));
  if (zdjecia?.length) {
    await withStore(db, 'zdjecia', 'readwrite', (store) => {
      zdjecia.forEach((z) => store.put(z));
    });
  }
}

// ---------- Zdjęcia dopięte do pozycji kosztorysu ("przed/po") ----------
// Zostają WYŁĄCZNIE na tym urządzeniu (IndexedDB) - nigdzie się nie wysyłają,
// nie ma synchronizacji. Eksport/import kopii zapasowej (niżej) też je obejmuje.

export async function dodajZdjeciePozycji(pozycjaId, blob) {
  const db = await openDB();
  const zdjecie = { id: cryptoId(), pozycja_id: pozycjaId, blob, data: new Date().toISOString() };
  await withStore(db, 'zdjecia', 'readwrite', (store) => store.put(zdjecie));
  return zdjecie;
}

export async function pobierzZdjeciaPozycji(pozycjaId) {
  const db = await openDB();
  const zdjecia = await getAll(db, 'zdjecia', 'pozycja_id', pozycjaId);
  return zdjecia.sort((a, b) => a.data.localeCompare(b.data));
}

// Do liczników "ile zdjęć ma ta pozycja" na całej liście kosztorysu jednym
// zapytaniem, zamiast osobnego zapytania na każdą pozycję.
export async function pobierzWszystkieZdjecia() {
  const db = await openDB();
  return getAll(db, 'zdjecia');
}

export async function usunZdjeciePozycji(id) {
  const db = await openDB();
  await withStore(db, 'zdjecia', 'readwrite', (store) => store.delete(id));
}

// ---------- Płatności (zaliczki/wpłaty klienta na poczet projektu) ----------

export async function pobierzPlatnosciProjektu(projektId) {
  const db = await openDB();
  const platnosci = await getAll(db, 'platnosci', 'projekt_id', projektId);
  return platnosci.sort((a, b) => a.data.localeCompare(b.data));
}

// Do zakładki Podsumowanie - dochód liczony wg daty WPŁATY (nie daty projektu),
// więc potrzebne wszystkie płatności naraz, ze wszystkich projektów.
export async function pobierzWszystkiePlatnosci() {
  const db = await openDB();
  return getAll(db, 'platnosci');
}

export async function dodajPlatnosc(projektId, { kwota, data, opis }) {
  const db = await openDB();
  const platnosc = {
    id: cryptoId(),
    projekt_id: projektId,
    kwota: Number(kwota),
    data: data || dzisiajYMD(),
    opis: (opis || '').trim(),
  };
  await withStore(db, 'platnosci', 'readwrite', (store) => store.put(platnosc));
  return platnosc;
}

export async function usunPlatnosc(id) {
  const db = await openDB();
  const platnosc = await getOne(db, 'platnosci', id);
  await withStore(db, 'platnosci', 'readwrite', (store) => store.delete(id));
  return platnosc;
}

export async function przywrocPlatnosc(platnosc) {
  const db = await openDB();
  await withStore(db, 'platnosci', 'readwrite', (store) => store.put(platnosc));
}

// ---------- Powiadomienia (w aplikacji - appka nie ma backendu do wysyłki) ----------
// Generowane lokalnie (patrz sprawdzPowiadomieniaProjektow w app.js) na
// podstawie dat projektów. `typ` służy do odróżnienia rodzaju ('5dni', '2dni',
// 'start') przy sprawdzaniu, czy dane powiadomienie już powstało - żeby nie
// dublować przy każdym otwarciu appki.

export async function pobierzPowiadomienia() {
  const db = await openDB();
  const powiadomienia = await getAll(db, 'powiadomienia');
  return powiadomienia.sort((a, b) => b.data_utworzenia.localeCompare(a.data_utworzenia));
}

// Zwraca true, jeśli powiadomienie tego typu dla tego projektu już istnieje
// (np. "5 dni przed" już raz wygenerowane) - bez tego każde otwarcie appki
// w tym samym dniu dodawałoby duplikat.
export async function istniejePowiadomienie(projektId, typ) {
  const db = await openDB();
  const dlaProjektu = await getAll(db, 'powiadomienia', 'projekt_id', projektId);
  return dlaProjektu.some((p) => p.typ === typ);
}

export async function dodajPowiadomienie({ projektId, typ, tresc }) {
  const db = await openDB();
  const powiadomienie = {
    id: cryptoId(),
    projekt_id: projektId,
    typ,
    tresc,
    data_utworzenia: new Date().toISOString(),
    przeczytane: false,
  };
  await withStore(db, 'powiadomienia', 'readwrite', (store) => store.put(powiadomienie));
  return powiadomienie;
}

export async function oznaczPowiadomieniaJakoPrzeczytane() {
  const db = await openDB();
  const wszystkie = await getAll(db, 'powiadomienia');
  const nieprzeczytane = wszystkie.filter((p) => !p.przeczytane);
  if (nieprzeczytane.length === 0) return;
  await withStore(db, 'powiadomienia', 'readwrite', (store) => {
    nieprzeczytane.forEach((p) => store.put({ ...p, przeczytane: true }));
  });
}

export async function pobierzLiczbeNieprzeczytanychPowiadomien() {
  const db = await openDB();
  const wszystkie = await getAll(db, 'powiadomienia');
  return wszystkie.filter((p) => !p.przeczytane).length;
}

// ---------- Ustawienia (dane firmy do nagłówka wydruku/PDF) ----------

const ID_USTAWIEN_FIRMY = 'firma';

export async function pobierzDaneFirmy() {
  const db = await openDB();
  const wszystkie = await getAll(db, 'ustawienia');
  return wszystkie.find((u) => u.id === ID_USTAWIEN_FIRMY) || { id: ID_USTAWIEN_FIRMY, nazwa: '', telefon: '', email: '', logo: null };
}

// UWAGA: `put()` na IndexedDB podmienia CAŁY rekord, nie scala pól - stąd
// dociągnięcie obecnego `logo` przed zapisem. Bez tego zwykły zapis telefonu/
// e-maila (formularz nie zna pola logo) wyzerowałby wcześniej wgrane logo.
export async function zapiszDaneFirmy({ nazwa, telefon, email }) {
  const db = await openDB();
  const obecne = await pobierzDaneFirmy();
  const dane = { id: ID_USTAWIEN_FIRMY, nazwa: (nazwa || '').trim(), telefon: (telefon || '').trim(), email: (email || '').trim(), logo: obecne.logo || null };
  await withStore(db, 'ustawienia', 'readwrite', (store) => store.put(dane));
  return dane;
}

// Logo firmy jako data URL (string) - osobna funkcja z tego samego powodu co
// wyżej: zapis logo nie może wyzerować nazwy/telefonu/e-maila.
export async function zapiszLogoFirmy(logoDataUrl) {
  const db = await openDB();
  const obecne = await pobierzDaneFirmy();
  const dane = { ...obecne, logo: logoDataUrl || null };
  await withStore(db, 'ustawienia', 'readwrite', (store) => store.put(dane));
  return dane;
}
