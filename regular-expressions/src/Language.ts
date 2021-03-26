namespace Regex {

// Representation of a (possibly infinite) regular language.
// The nth value in the iterator is an array of strings of length n,
// in alphabetical order without duplicates.
export type Language = Iterator<Array<string>>;

// all strings, in order of length and then contents
export function strings(l: Language): Iterable<string> {
	return { [Symbol.iterator]: () => catAll(l) };
}

// Language operators

export function* emptyString(): Language {
	yield [""];
}

export function* singleLetter(c: string): Language {
	yield [];
	yield [c];
}

// consumes the argument iterators
export function* unionLangs(l1: Language, l2: Language): Language {
	return longZip(merge, l1, l2);
}

// consumes the argument iterators
export function* catLangs(l1: Language, l2: Language): Language {
	let front1: Array<Array<string>> = [];
	let front2: Array<Array<string>> = [];
	let n_strings1: IteratorResult<Array<string>> = l1.next();
	let n_strings2: IteratorResult<Array<string>> = l2.next();
	for (let n: number = 0; ; n++) {
		// n_strings1 & n_strings2 contain strings of length n
		if (! n_strings1.done) {
			front1.push(n_strings1.value);
			n_strings1 = l1.next();
		}
		if (! n_strings2.done) {
			front2.push(n_strings2.value);
			n_strings2 = l2.next();
		}
		// front1 & front2 contain strings of length up to n
		// construct strings of length n
		const start: number = Math.max(0, n - front2.length + 1);
		const finish: number = Math.min(n, front1.length - 1);
		if (start > finish)
			return;
		let conc: Array<string> = [];
		for (let i: number = start; i <= finish; i++)
			conc = merge(conc, catLang(front1[i], front2[n-i]));
		yield conc;
	}
}

// consumes the argument iterator
export function* starLang(l: Language): Language {
	let l_star: Array<Array<string>> = [];
	let conc: Array<string> = [""]
	l_star.push(conc);
	yield conc;

	let l_front: Array<Array<string>> = [];
	let n_strings: IteratorResult<Array<string>> = l.next();
	if (! n_strings.done) {
		l_front.push(n_strings.value);
		n_strings = l.next();
	}
	if (n_strings.done) // L contains no non-empty strings, so L* = { "" }
		return;
	for (let n: number = 1; ; n++) {
		if (! n_strings.done) {
			l_front.push(n_strings.value);
			n_strings = l.next();
		}
		// construct strings of length n
		const finish: number = Math.min(n, l_front.length - 1);
		conc = [];
		for (let i: number = 1; i <= finish; i++) {
			conc = merge(conc, catLang(l_front[i], l_star[n-i]));
		}
		l_star.push(conc);
		yield conc;
	}
}

// Iterator combinators

// Iterator of arrays -> iterator of elements
function* catAll<T>(xss: Iterator<Array<T>>): Iterator<T> {
	for (let curr_xs = xss.next(); ! curr_xs.done; curr_xs = xss.next())
		yield* curr_xs.value;
}

// consumes the argument iterators
function* longZip<T>(f: (x: T, y: T) => T, xs: Iterator<T>, ys: Iterator<T>): Iterator<T> {
	let curr_x: IteratorResult<T> = xs.next();
	let curr_y: IteratorResult<T> = ys.next();
	while (! curr_x.done || ! curr_y.done) {
		if (curr_x.done) {
			yield curr_y.value;
			curr_y = ys.next();
		} else if (curr_y.done) {
			yield curr_x.value;
			curr_x = xs.next();
		} else {
			yield f(curr_x.value, curr_y.value);
			curr_x = xs.next();
			curr_y = ys.next();
		}
	}
}

// Operations on ordered arrays of strings without duplicates

// merge two arrays in ascending order without duplicates
function merge(xs: Array<string>, ys: Array<string>): Array<string> {
	// shortcuts for special cases
	if (xs.length === 0)
		return ys;
	if (ys.length === 0)
		return xs;

	let i: number = 0;
	let j: number = 0;
	let result: Array<string> = [];
	while (i < xs.length || j < ys.length) {
		if (j === ys.length || xs[i] < ys[j]) {
			result.push(xs[i]);
			i++;
		} else {
			result.push(ys[j]);
			if (i < xs.length && xs[i] === ys[j])
				i++;
			j++;
		}
	}
	return result;
}

// concatenate all combinations
function catLang(xs: Array<string>, ys: Array<string>): Array<string> {
	let all: Array<string> = [];
	for (const x of xs) {
		let xys: Array<string> = [];
		for (const y of ys)
			xys.push(x + y);
		all = merge(all, xys);
	}
	return all;
}

}
