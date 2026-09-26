// Czyste funkcje liczące kosztorys - bez zależności od DOM/DB, żeby dało się je testować wprost.

export function kwotaPozycji(ilosc, stawka) {
  const i = Number(ilosc);
  const s = Number(stawka);
  if (!Number.isFinite(i) || !Number.isFinite(s)) return 0;
  return Math.round(i * s * 100) / 100;
}

// pozycje: [{ [pole], ilosc, stawka }]
// zwraca: [{ klucz, suma }] posortowane wg pierwszego wystąpienia wartości pola.
// Używane zarówno do grupowania wg kategorii, jak i wg pomieszczenia.
export function sumyPolem(pozycje, pole, domyslnaEtykieta) {
  const kolejnosc = [];
  const sumy = new Map();
  for (const p of pozycje) {
    const klucz = p[pole] || domyslnaEtykieta;
    const kwota = kwotaPozycji(p.ilosc, p.stawka);
    if (!sumy.has(klucz)) {
      sumy.set(klucz, 0);
      kolejnosc.push(klucz);
    }
    sumy.set(klucz, Math.round((sumy.get(klucz) + kwota) * 100) / 100);
  }
  return kolejnosc.map((klucz) => ({ klucz, suma: sumy.get(klucz) }));
}

// pozycje: [{ kategoria, ilosc, stawka }]
// zwraca: [{ kategoria, suma }] posortowane wg pierwszego wystąpienia kategorii
export function sumyKategorii(pozycje) {
  return sumyPolem(pozycje, 'kategoria', 'Bez kategorii').map(({ klucz, suma }) => ({ kategoria: klucz, suma }));
}

// pozycje: [{ pomieszczenie, ilosc, stawka }]
export function sumyPomieszczen(pozycje) {
  return sumyPolem(pozycje, 'pomieszczenie', 'Bez pomieszczenia').map(({ klucz, suma }) => ({ pomieszczenie: klucz, suma }));
}

export function sumaCalkowita(pozycje) {
  return pozycje.reduce((acc, p) => Math.round((acc + kwotaPozycji(p.ilosc, p.stawka)) * 100) / 100, 0);
}

export function sumaPlatnosci(platnosci) {
  return platnosci.reduce((acc, p) => Math.round((acc + Number(p.kwota || 0)) * 100) / 100, 0);
}

export function formatujKwote(kwota) {
  return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kwota) + ' zł';
}
