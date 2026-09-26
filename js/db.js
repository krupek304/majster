// Warstwa danych - IndexedDB. Wszystko lokalnie na urządzeniu, zero sieci.
// Pole `dodane_przez` w pozycjach kosztorysu wskazuje na uzytkownicy.id -
// dziś zawsze jeden, domyślny użytkownik, ale schemat jest gotowy na dodanie kolejnych kont później.

const DB_NAME = 'majster-db';
const DB_VERSION = 4;
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

// ---------- Projekty ----------

export async function pobierzProjekty() {
  const db = await openDB();
  const projekty = await getAll(db, 'projekty');
  return projekty.sort((a, b) => b.data_utworzenia.localeCompare(a.data_utworzenia));
}

export async function dodajProjekt({ nazwa, klient }) {
  const db = await openDB();
  const projekt = {
    id: cryptoId(),
    nazwa: nazwa.trim(),
    klient: (klient || '').trim(),
    data_utworzenia: new Date().toISOString(),
  };
  await withStore(db, 'projekty', 'readwrite', (store) => store.put(projekt));
  return projekt;
}

export async function usunProjekt(projektId) {
  const db = await openDB();
  const [pozycje, platnosci] = await Promise.all([
    getAll(db, 'pozycje', 'projekt_id', projektId),
    getAll(db, 'platnosci', 'projekt_id', projektId),
  ]);
  await withStore(db, 'pozycje', 'readwrite', (store) => {
    pozycje.forEach((p) => store.delete(p.id));
  });
  await withStore(db, 'platnosci', 'readwrite', (store) => {
    platnosci.forEach((p) => store.delete(p.id));
  });
  await withStore(db, 'projekty', 'readwrite', (store) => store.delete(projektId));
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
  const kategoria = { id: cryptoId(), nazwa: nazwa.trim(), kolejnosc: istniejace.length, ukryta: false };
  await withStore(db, 'kategorie', 'readwrite', (store) => store.put(kategoria));
  return kategoria;
}

export async function aktualizujKategorie(kategoria) {
  const db = await openDB();
  await withStore(db, 'kategorie', 'readwrite', (store) => store.put(kategoria));
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
  await withStore(db, 'cennik', 'readwrite', (store) => store.delete(id));
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
  await withStore(db, 'pozycje', 'readwrite', (store) => store.delete(id));
}

// ---------- Płatności (zaliczki/wpłaty klienta na poczet projektu) ----------

export async function pobierzPlatnosciProjektu(projektId) {
  const db = await openDB();
  const platnosci = await getAll(db, 'platnosci', 'projekt_id', projektId);
  return platnosci.sort((a, b) => a.data.localeCompare(b.data));
}

export async function dodajPlatnosc(projektId, { kwota, data, opis }) {
  const db = await openDB();
  const platnosc = {
    id: cryptoId(),
    projekt_id: projektId,
    kwota: Number(kwota),
    data: data || new Date().toISOString().slice(0, 10),
    opis: (opis || '').trim(),
  };
  await withStore(db, 'platnosci', 'readwrite', (store) => store.put(platnosc));
  return platnosc;
}

export async function usunPlatnosc(id) {
  const db = await openDB();
  await withStore(db, 'platnosci', 'readwrite', (store) => store.delete(id));
}

// ---------- Ustawienia (dane firmy do nagłówka wydruku/PDF) ----------

const ID_USTAWIEN_FIRMY = 'firma';

export async function pobierzDaneFirmy() {
  const db = await openDB();
  const wszystkie = await getAll(db, 'ustawienia');
  return wszystkie.find((u) => u.id === ID_USTAWIEN_FIRMY) || { id: ID_USTAWIEN_FIRMY, nazwa: '', telefon: '', email: '' };
}

export async function zapiszDaneFirmy({ nazwa, telefon, email }) {
  const db = await openDB();
  const dane = { id: ID_USTAWIEN_FIRMY, nazwa: (nazwa || '').trim(), telefon: (telefon || '').trim(), email: (email || '').trim() };
  await withStore(db, 'ustawienia', 'readwrite', (store) => store.put(dane));
  return dane;
}
