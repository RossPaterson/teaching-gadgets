// Set content of the identified DOM element to the language denoted by
// the regular expression text.
//
// Example usage:
// <input type="text" size="15" value="" onchange="regexLanguage('target-id', this.value);"/>
// <p id="target-id"></p>
//
// The input field accepts basic regular expressions with alphanumeric
// characters and meta-characters |, *, ( and ).
function regexLanguage(element_id: string, re_text: string): void {
	let text: string = "";
	try {
		text = showLanguage(150, new CharScanner(re_text).allExpr());
	} catch (err) {
		text = `<em>Malformed expression: ${err}</em>`;
	}
	document.getElementById(element_id).innerHTML = text;
}

// String representing the language denoted by e, of length at most n (approx)
function showLanguage(n: number, e: Regexp): string {
	const xs: Iterator<string> = catAll(e.language());
	let ss: Array<string> = [];
	let curr_x: IteratorResult<string> = xs.next();
	while (! curr_x.done) {
		n -= curr_x.value.length + 2;
		if (n < 0) {
			ss.push("...");
			break;
		}
		ss.push(curr_x.value);
		curr_x = xs.next();
	}
	if (ss[0] == "")
		ss[0] = "ε";
	return `{ ${ss.join(", ")} }`;
}

// Scanner for recursive descent parser for regular expressions

class CharScanner {
	private str: string;
	private pos: number;

	constructor(str: string) {
		this.str = str;
		this.pos = 0;
	}

	get(): string {
		return this.pos < this.str.length ?
			this.str.charAt(this.pos) : '';
	}

	advance(): void {
		if (this.pos < this.str.length)
			this.pos++;
	}

	fail(msg: string): never {
		throw msg;
	}

	match(t: string): void {
		const c: string = this.get();
		if (c != t)
			this.fail(`'${c}' found when expecting '${t}'`);
		this.advance();
	}

	// whole string as a regular expression
	allExpr(): Regexp {
		const e: Regexp = this.expr();
		if (this.get() != '')
			this.fail(`unexpected '${this.get()}'`);
		return e;
	}

	// e = t ('|' t)*
	expr(): Regexp {
		let e: Regexp = this.term();
		while (this.get() == '|') {
			this.advance();
			e = new OrExpr(e, this.term());
		}
		return e;
	}

	// t = f*
	term(): Regexp {
		let t: Regexp = new EmptyExpr();
		let c: string = this.get();
		while (c == '(' || isAlphaNum(c) || c == 'ε') {
			t = new AndExpr(t, this.factor());
			c = this.get();
		}
		return t;
	}

	factor(): Regexp {
		let c: string = this.get();
		let f: Regexp;
		if (isAlphaNum(c)) {
			f = new SingleExpr(c);
			this.advance();
		} else if (c == '(') {
			this.advance();
			f = this.expr();
			this.match(')');
		} else if (c == 'ε') {
			f = new EmptyExpr();
			this.advance();
		} else {
			this.fail("letter or '(' expected");
		}
		c = this.get();
		while (c == '*') {
			f = new StarExpr(f);
			this.advance();
			c = this.get();
		}
		return f;
	}
}

function isAlphaNum(c: string): boolean {
	return 'a' <= c && c <= 'z' || 'A' <= c && c <= 'Z' ||
		'0' <= c && c <= '9';
}

// Representation of a (possibly infinite) regular language.
// The nth value in the iterator is an array of strings of length n,
// in alphabetical order without duplicates.
type Language = Iterator<Array<string>>;

abstract class Regexp {
	abstract language(): Language;
}

// empty string
class EmptyExpr extends Regexp {
	constructor() {
		super();
	}

	language(): Language {
		return emptyString();
	}
}

// single character
class SingleExpr extends Regexp {
	private readonly c: string;

	constructor(c: string) {
		super();
		this.c = c;
	}

	language(): Language {
		return singleLetter(this.c);
	}
};

// e1 | e2
class OrExpr extends Regexp {
	private readonly e1: Regexp;
	private readonly e2: Regexp;

	constructor(e1: Regexp, e2: Regexp) {
		super();
		this.e1 = e1;
		this.e2 = e2;
	}

	language(): Language {
		return longZip(merge, this.e1.language(), this.e2.language());
	}
}

// e1 e2
class AndExpr extends Regexp {
	private readonly e1: Regexp;
	private readonly e2: Regexp;

	constructor(e1: Regexp, e2: Regexp) {
		super();
		this.e1 = e1;
		this.e2 = e2;
	}

	language(): Language {
		return catLangs(this.e1.language(), this.e2.language());
	}
}

// e*
class StarExpr extends Regexp {
	private readonly e: Regexp;

	constructor(e: Regexp) {
		super();
		this.e = e;
	}

	language(): Language {
		return starLang(this.e.language());
	}
}

// Iterator combinators

// Iterator of arrays -> iterator of elements
function* catAll<T>(xss: Iterator<Array<T>>): Iterator<T> {
	let curr_xs: IteratorResult<Array<T>> = xss.next();
	while (! curr_xs.done) {
		for (let value of curr_xs.value)
			yield(value);
		curr_xs = xss.next();
	}
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

// Language operators

function* emptyString(): Language {
	yield [""];
}

function* singleLetter(c: string): Language {
	yield [];
	yield [c];
}

// consumes the argument iterators
function* catLangs(l1: Language, l2: Language): Language {
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
		let start: number = Math.max(0, n - front2.length + 1);
		let finish: number = Math.min(n, front1.length - 1);
		if (start > finish)
			return;
		let conc: Array<string> = [];
		for (let i: number = start; i <= finish; i++)
			conc = merge(conc, catLang(front1[i], front2[n-i]));
		yield conc;
	}
}

// consumes the argument iterator
function* starLang(l: Language): Language {
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
		let finish: number = Math.min(n, l_front.length - 1);
		conc = [];
		for (let i: number = 1; i <= finish; i++) {
			conc = merge(conc, catLang(l_front[i], l_star[n-i]));
		}
		l_star.push(conc);
		yield conc;
	}
}

// Operations on ordered arrays of strings without duplicates

// merge two arrays in ascending order without duplicates
function merge(xs: Array<string>, ys: Array<string>): Array<string> {
	// shortcuts for special cases
	if (xs.length == 0)
		return ys;
	if (ys.length == 0)
		return xs;

	let i: number = 0;
	let j: number = 0;
	let result: Array<string> = [];
	while (i < xs.length || j < ys.length) {
		if (j == ys.length || xs[i] < ys[j]) {
			result.push(xs[i]);
			i++;
		} else {
			result.push(ys[j]);
			if (i < xs.length && xs[i] == ys[j])
				i++;
			j++;
		}
	}
	return result;
}

// concatenate all combinations
function catLang(xs: Array<string>, ys: Array<string>): Array<string> {
	let all: Array<string> = [];
	for (let x of xs) {
		let xys: Array<string> = [];
		for (let y of ys)
			xys.push(x + y);
		all = merge(all, xys);
	}
	return all;
}
