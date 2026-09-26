// Warstwa danych - IndexedDB. Wszystko lokalnie na urządzeniu, zero sieci.
// Pole `dodane_przez` w pozycjach kosztorysu wskazuje na uzytkownicy.id -
// dziś zawsze jeden, domyślny użytkownik, ale schemat jest gotowy na dodanie kolejnych kont później.

const DB_NAME = 'majster-db';
const DB_VERSION = 1;
const DOMYSLNY_UZYTKOWNIK_ID = 'ja';

const DOMYSLNE_KATEGORIE = [
  'Prace rozbiórkowe',
  'Instalacja elektryczna',
  'Instalacja wodno-kanalizacyjna',
  'Instalacja grzewcza / wentylacja',
  'Tynki i gładzie',
  'Malowanie',
  'Podłogi',
  'Płytki i okładziny',
  'Stolarka drzwiowa i okienna',
  'Zabudowa meblowa / montaż',
  'Wywóz gruzu / utylizacja',
  'Inne',
];

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
  const kategorie = await getAll(db, 'kategorie');
  if (kategorie.length === 0) {
    await withStore(db, 'kategorie', 'readwrite', (store) => {
      DOMYSLNE_KATEGORIE.forEach((nazwa, i) => {
        store.put({ id: cryptoId(), nazwa, kolejnosc: i });
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
