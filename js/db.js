// Warstwa danych - IndexedDB. Wszystko lokalnie na urządzeniu, zero sieci.
// Pole `dodane_przez` w pozycjach kosztorysu wskazuje na uzytkownicy.id -
// dziś zawsze jeden, domyślny użytkownik, ale schemat jest gotowy na dodanie kolejnych kont później.

const DB_NAME = 'majster-db';
const DB_VERSION = 2;
const DOMYSLNY_UZYTKOWNIK_ID = 'ja';

// Pełna kolejność etapów wykończenia mieszkania (od przygotowania po odbiór),
// każda kategoria z typowymi podkategoriami (bez jednostek/stawek - te wpisuje
// zawsze fachowiec ręcznie, nigdy nie zgadujemy cen).
const DOMYSLNE_KATEGORIE_Z_PODKATEGORIAMI = {
  'Przygotowanie i planowanie': [
    'Opracowanie projektu wnętrza (układ ścian, punkty instalacyjne, dobór materiałów)',
    'Sporządzenie harmonogramu i kosztorysu prac',
    'Zakup i dostawa materiałów budowlanych oraz wykończeniowych',
    'Zabezpieczenie mieszkania przed pyłem i uszkodzeniami (folie, kartony)',
  ],
  'Prace rozbiórkowe i konstrukcyjne': [
    'Wyburzanie ścianek działowych lub ich fragmentów',
    'Demontaż starych instalacji, armatury, ościeżnic, podłóg, płytek',
    'Stawianie nowych ścianek działowych (bloczki, płyty gipsowo-kartonowe)',
    'Wykucie bruzd pod instalacje elektryczne i hydrauliczne',
  ],
  'Instalacje wewnętrzne (stan surowy)': [
    'Rozprowadzenie instalacji elektrycznej (przewody, puszki, rozdzielnia)',
    'Rozprowadzenie instalacji hydraulicznej (woda, kanalizacja, przyłącza do AGD)',
    'Montaż instalacji wentylacyjnej lub rekuperacji (opcjonalnie)',
    'Montaż instalacji ogrzewania (grzejniki, ogrzewanie podłogowe)',
    'Montaż stelaży podtynkowych (WC, umywalki)',
  ],
  'Prace tynkarskie i wylewki': [
    'Tynkowanie ścian i sufitów (tynki cementowo-wapienne lub gipsowe)',
    'Osadzanie ościeżnic drzwiowych (futryn) w otworach',
    'Wykonanie wylewek podłogowych (tradycyjne lub samopoziomujące)',
    'Gruntowanie podłoży przed dalszymi pracami',
  ],
  'Zabudowy z płyt gipsowo-kartonowych (GK)': [
    'Budowa sufitów podwieszanych z oświetleniem punktowym',
    'Zabudowa instalacji (np. rury, skrzynki)',
    'Wykonanie wnęk, ścianek ozdobnych, obudów kominków',
    'Szpachlowanie połączeń płyt GK',
  ],
  'Prace glazurnicze i terakota': [
    'Hydroizolacja łazienki, kuchni i innych stref mokrych (folia w płynie, mata uszczelniająca)',
    'Układanie płytek ceramicznych na ścianach (łazienka, kuchnia, przedpokój)',
    'Układanie płytek podłogowych (terakota, gres)',
    'Wykonanie obróbek, listew przypodłogowych z płytek, narożników',
    'Impregnacja i czyszczenie płytek po ułożeniu',
  ],
  'Gładzie i przygotowanie ścian do malowania': [
    'Nakładanie gładzi gipsowych na ściany i sufity',
    'Szlifowanie gładzi do uzyskania idealnej gładkości',
    'Gruntowanie ścian przed malowaniem',
    'Pierwsze malowanie (warstwa podkładowa, tzw. "białe malowanie")',
  ],
  'Podłogi': [
    'Układanie paneli podłogowych',
    'Montaż podłóg drewnianych (deski, parkiet, mozaika)',
    'Układanie wykładzin dywanowych lub winylowych',
    'Montaż listew przypodłogowych (cokołów)',
    'Cyklinowanie i lakierowanie podłóg drewnianych (w razie potrzeby)',
  ],
  'Stolarka drzwiowa i okienna': [
    'Montaż drzwi wewnętrznych (skrzydła, zawiasy, klamki)',
    'Regulacja drzwi i zamków',
    'Montaż parapetów wewnętrznych',
    'Ewentualna wymiana lub regulacja okien (jeśli w zakresie)',
  ],
  'Malowanie i wykończenie ścian': [
    'Malowanie końcowe ścian i sufitów (2-3 warstwy farby)',
    'Klejenie tapet (alternatywa dla malowania)',
    'Montaż listew ozdobnych, gzymsów, cokołów dekoracyjnych',
  ],
  'Biały montaż i osprzęt': [
    'Montaż armatury łazienkowej (baterie, prysznice, deszczownice)',
    'Montaż ceramiki sanitarnej (umywalki, WC, bidety, wanny, kabiny)',
    'Montaż oświetlenia (lampy, plafony, taśmy LED)',
    'Montaż osprzętu elektrycznego (gniazdka, włączniki, ramki)',
    'Montaż grzejników i głowic termostatycznych',
    'Montaż mebli łazienkowych i kuchennych (szafki, blaty)',
  ],
  'Kuchnia i AGD': [
    'Montaż zabudowy kuchennej (szafki górne i dolne)',
    'Podłączenie zlewu i baterii kuchennej',
    'Montaż i podłączenie sprzętu AGD (lodówka, piekarnik, płyta, zmywarka, okap)',
  ],
  'Sprzątanie i odbiór': [
    'Usunięcie zabezpieczeń (folii, kartonów)',
    'Dokładne sprzątanie mieszkania po wszystkich pracach',
    'Wywóz gruzu i odpadów budowlanych',
    'Odbiór techniczny z inwestorem (sprawdzenie jakości prac)',
  ],
  'Prace dodatkowe i opcjonalne': [
    'Montaż klimatyzacji',
    'Montaż rolet, żaluzji, firan i zasłon',
    'Montaż luster, półek, wieszaków, akcesoriów łazienkowych',
    'Dekory ścienne (obrazy, naklejki, fototapety)',
    'Montaż systemów Smart Home (czujniki, sterowanie oświetleniem)',
  ],
};
const DOMYSLNE_KATEGORIE = Object.keys(DOMYSLNE_KATEGORIE_Z_PODKATEGORIAMI);

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
      if (!db.objectStoreNames.contains('podkategorie')) {
        const store = db.createObjectStore('podkategorie', { keyPath: 'id' });
        store.createIndex('kategoria', 'kategoria', { unique: false });
      }
      if (!db.objectStoreNames.contains('uzytkownicy')) {
        db.createObjectStore('uzytkownicy', { keyPath: 'id' });
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

  const istniejacePodkategorie = await getAll(db, 'podkategorie');
  const istniejaceParyKatNazwa = new Set(istniejacePodkategorie.map((p) => p.kategoria + '\u0001' + p.nazwa));
  const brakujacePodkategorie = [];
  Object.entries(DOMYSLNE_KATEGORIE_Z_PODKATEGORIAMI).forEach(([kategoria, lista]) => {
    lista.forEach((nazwa, i) => {
      if (!istniejaceParyKatNazwa.has(kategoria + '\u0001' + nazwa)) {
        brakujacePodkategorie.push({ kategoria, nazwa, kolejnosc: i });
      }
    });
  });
  if (brakujacePodkategorie.length > 0) {
    await withStore(db, 'podkategorie', 'readwrite', (store) => {
      brakujacePodkategorie.forEach(({ kategoria, nazwa, kolejnosc }) => {
        store.put({ id: cryptoId(), kategoria, nazwa, kolejnosc });
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
  const pozycje = await getAll(db, 'pozycje', 'projekt_id', projektId);
  await withStore(db, 'pozycje', 'readwrite', (store) => {
    pozycje.forEach((p) => store.delete(p.id));
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
  const kategoria = { id: cryptoId(), nazwa: nazwa.trim(), kolejnosc: istniejace.length };
  await withStore(db, 'kategorie', 'readwrite', (store) => store.put(kategoria));
  return kategoria;
}

// ---------- Podkategorie (typowe czynności w ramach kategorii, bez cen) ----------

export async function pobierzPodkategorie() {
  const db = await openDB();
  const podkategorie = await getAll(db, 'podkategorie');
  return podkategorie.sort((a, b) => a.kolejnosc - b.kolejnosc);
}

// ---------- Cennik ----------

export async function pobierzCennik() {
  const db = await openDB();
  const cennik = await getAll(db, 'cennik');
  return cennik.sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'));
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

export async function dodajPozycjeKosztorysu(projektId, { nazwa, kategoria, jednostka, ilosc, stawka }) {
  const db = await openDB();
  const pozycja = {
    id: cryptoId(),
    projekt_id: projektId,
    nazwa: nazwa.trim(),
    kategoria,
    jednostka: jednostka.trim(),
    ilosc: Number(ilosc),
    stawka: Number(stawka),
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
