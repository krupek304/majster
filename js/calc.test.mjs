import { kwotaPozycji, sumyKategorii, sumaCalkowita, formatujKwote } from './calc.js';

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

console.log('formatujKwote(3375) ->', formatujKwote(3375));

console.log(`\nWynik: ${ok} OK, ${fail} FAIL (${ok + fail} sprawdzeń)`);
process.exit(fail > 0 ? 1 : 0);
