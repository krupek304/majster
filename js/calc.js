// Czyste funkcje liczące kosztorys - bez zależności od DOM/DB, żeby dało się je testować wprost.

export function kwotaPozycji(ilosc, stawka) {
  const i = Number(ilosc);
  const s = Number(stawka);
  if (!Number.isFinite(i) || !Number.isFinite(s)) return 0;
  return Math.round(i * s * 100) / 100;
}

// pozycje: [{ kategoria, ilosc, stawka }]
// zwraca: [{ kategoria, suma }] posortowane wg pierwszego wystąpienia kategorii
export function sumyKategorii(pozycje) {
  const kolejnosc = [];
  const sumy = new Map();
  for (const p of pozycje) {
    const kat = p.kategoria || 'Bez kategorii';
    const kwota = kwotaPozycji(p.ilosc, p.stawka);
    if (!sumy.has(kat)) {
      sumy.set(kat, 0);
      kolejnosc.push(kat);
    }
    sumy.set(kat, Math.round((sumy.get(kat) + kwota) * 100) / 100);
  }
  return kolejnosc.map((kategoria) => ({ kategoria, suma: sumy.get(kategoria) }));
}

export function sumaCalkowita(pozycje) {
  return pozycje.reduce((acc, p) => Math.round((acc + kwotaPozycji(p.ilosc, p.stawka)) * 100) / 100, 0);
}

export function formatujKwote(kwota) {
  return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kwota) + ' zł';
}
