// tests for IterableUtils

import {
	append, cons, drop, every, filter, fixpoint, iterate,
	map, mergeWith, once, scanl, take, takeWhile, zipWith
	} from "./IterableUtils";

// infinite list of prime numbers
const primes: Iterable<number> = once(
	cons(2, filter(isPrime)(iterate((n: number) => n+2, 3))));

function isPrime(n: number): boolean {
	return every((p: number) => n%p !== 0)
		(takeWhile((p: number) => p*p <= n)(primes));
}

// infinite list of Fibonacci numbers
const fibs: Iterable<number> = fixpoint((ns: Iterable<number>) =>
	append([0,1], zipWith((x: number, y: number) => x+y)(ns, drop(1, ns))));

// infinite list of Hamming numbers
const hamming: Iterable<number> = fixpoint((ns: Iterable<number>) =>
	cons(1,
	mergeWith(compareNum)
		(map((n: number) => n*2)(ns),
		 mergeWith(compareNum)
			(map((n: number) => n*3)(ns),
			 map((n: number) => n*5)(ns)))));

function compareNum(x: number, y: number): number { return x-y; }

// infinite list of factorials
const factorials: Iterable<number> = once(
	scanl((x: number, y: number) => x*y, 1)(iterate((n) => n+1, 1)));

// show the initial portion of an infinite list
function test(name: string, ns: Iterable<number>): void {
	console.log(name + " = " + Array.from(take(25, ns)) + ",...");
}

test("primes", primes);
test("fibs", fibs);
test("hamming", hamming);
test("factorials", factorials);
