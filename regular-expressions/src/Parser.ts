/// <reference path="CharScanner.ts" />
/// <reference path="RegExpr.ts" />
namespace Regex {

// whole string as a regular expression
export function parseRegExpr(s: string): RegExpr {
	let scanner = new CharScanner(s);
	const e: RegExpr = expr(scanner);
	if (scanner.get() !== '')
		scanner.fail(`unexpected '${scanner.get()}'`);
	return e;
}

// e = t ('|' t)*
function expr(scanner: CharScanner): RegExpr {
	let e: RegExpr = term(scanner);
	while (scanner.get() === '|') {
		scanner.advance();
		e = orExpr(e, term(scanner));
	}
	return e;
}

// t = f*
function term(scanner: CharScanner): RegExpr {
	let t: RegExpr = emptyExpr();
	let c: string = scanner.get();
	while (c === '(' || isAlphaNum(c) || c === 'ε') {
		t = andExpr(t, factor(scanner));
		c = scanner.get();
	}
	return t;
}

function factor(scanner: CharScanner): RegExpr {
	let c: string = scanner.get();
	let f: RegExpr;
	if (isAlphaNum(c)) {
		f = singleExpr(c);
		scanner.advance();
	} else if (c === '(') {
		scanner.advance();
		f = expr(scanner);
		scanner.match(')');
	} else if (c === 'ε') {
		f = emptyExpr();
		scanner.advance();
	} else {
		scanner.fail("letter or '(' expected");
	}
	c = scanner.get();
	while (c === '*') {
		f = starExpr(f);
		scanner.advance();
		c = scanner.get();
	}
	return f;
}

}
