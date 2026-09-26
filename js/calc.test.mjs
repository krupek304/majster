import { kwotaPozycji, sumyKategorii, sumyPomieszczen, sumaCalkowita, sumaPlatnosci, formatujKwote } from './calc.js';

let ok = 0, fail = 0;
function assertEq(actual, expected, label) {
  const pass = Math.abs(actual - expected) < 1e-9 || actual === expected;
  console.log(`${pass ? 'OK ' : 'FAIL'} ${label}: oczekiwano=${expected} otrzymano=${actual}`);
  pass ? ok++ : fail++;
}

assertEq(kwotaPozycji(20, 45), 900, 'kwotaPozycji(20, 45)');
assertEq(kwotaPozycji(3, 10.1), 30.3, 'kwotaPozycji(3, 10.1)');
assertEq(kwotaPozycji('abc', 10), 0, 'kwotaPozycji(NaN input)');

const pozycje = [
  { kategoria: 'Płytki', ilosc: 20, stawka: 45 },
  { kategoria: 'Płytki', ilosc: 5, stawka: 45 },
  { kategoria: 'Malowanie', ilosc: 60, stawka: 12.5 },
  { kategoria: 'Elektryka', ilosc: 1, stawka: 1500 },
];

assertEq(sumaCalkowita(pozycje), 3375, 'sumaCalkowita(4 pozycje)');

const suby = sumyKategorii(pozycje);
console.log('sumyKategorii ->', JSON.stringify(suby));
assertEq(suby.length, 3, 'liczba kategorii (przed=4 pozycje, po=3 unikalne)');
assertEq(suby.find(s => s.kategoria === 'Płytki').suma, 1125, 'suma kategorii Płytki (900+225)');
assertEq(suby.find(s => s.kategoria === 'Malowanie').suma, 750, 'suma kategorii Malowanie');
assertEq(suby.find(s => s.kategoria === 'Elektryka').suma, 1500, 'suma kategorii Elektryka');

assertEq(sumaCalkowita([]), 0, 'sumaCalkowita([]) pusta lista');
assertEq(sumyKategorii([]).length, 0, 'sumyKategorii([]) pusta lista');

// Pomieszczenia - ten sam mechanizm co kategorie, ale drugi wymiar grupowania
const pozycjeZPomieszczeniami = [
  { pomieszczenie: 'Łazienka', ilosc: 5, stawka: 100 },
  { pomieszczenie: 'Łazienka', ilosc: 2, stawka: 50 },
  { pomieszczenie: 'Kuchnia', ilosc: 10, stawka: 30 },
  { ilosc: 1, stawka: 20 }, // bez pomieszczenia -> "Bez pomieszczenia"
];
const subyPom = sumyPomieszczen(pozycjeZPomieszczeniami);
console.log('sumyPomieszczen ->', JSON.stringify(subyPom));
assertEq(subyPom.length, 3, 'liczba pomieszczeń (przed=4 pozycje, po=3 grupy)');
assertEq(subyPom.find(s => s.pomieszczenie === 'Łazienka').suma, 600, 'suma Łazienka (500+100)');
assertEq(subyPom.find(s => s.pomieszczenie === 'Kuchnia').suma, 300, 'suma Kuchnia');
assertEq(subyPom.find(s => s.pomieszczenie === 'Bez pomieszczenia').suma, 20, 'pozycja bez pomieszczenia dostaje domyślną etykietę');

// Płatności
const platnosci = [{ kwota: 2000 }, { kwota: 1500.50 }, { kwota: 0 }];
assertEq(sumaPlatnosci(platnosci), 3500.5, 'sumaPlatnosci(3 wpłaty)');
assertEq(sumaPlatnosci([]), 0, 'sumaPlatnosci([]) pusta lista');

console.log('formatujKwote(3375) ->', formatujKwote(3375));

console.log(`\nWynik: ${ok} OK, ${fail} FAIL (${ok + fail} sprawdzeń)`);
process.exit(fail > 0 ? 1 : 0);
