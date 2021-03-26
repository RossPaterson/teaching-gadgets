/// <reference path="CharScanner.ts" />
/// <reference path="Language.ts" />
namespace Regex {

// whole string as a regular expression
export function allExpr(scanner: CharScanner): RegExpr {
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
		e = new OrExpr(e, term(scanner));
	}
	return e;
}

// t = f*
function term(scanner: CharScanner): RegExpr {
	let t: RegExpr = new EmptyExpr();
	let c: string = scanner.get();
	while (c === '(' || isAlphaNum(c) || c === 'ε') {
		t = new AndExpr(t, factor(scanner));
		c = scanner.get();
	}
	return t;
}

function factor(scanner: CharScanner): RegExpr {
	let c: string = scanner.get();
	let f: RegExpr;
	if (isAlphaNum(c)) {
		f = new SingleExpr(c);
		scanner.advance();
	} else if (c === '(') {
		scanner.advance();
		f = expr(scanner);
		scanner.match(')');
	} else if (c === 'ε') {
		f = new EmptyExpr();
		scanner.advance();
	} else {
		scanner.fail("letter or '(' expected");
	}
	c = scanner.get();
	while (c === '*') {
		f = new StarExpr(f);
		scanner.advance();
		c = scanner.get();
	}
	return f;
}

export interface RegExpr {
	language(): Language;
}

// empty string
class EmptyExpr implements RegExpr {
	constructor() {}

	language(): Language {
		return emptyString();
	}
}

// single character
class SingleExpr implements RegExpr {
	constructor(private readonly c: string) {}

	language(): Language {
		return singleLetter(this.c);
	}
};

// e1 | e2
class OrExpr implements RegExpr {
	constructor(private readonly e1: RegExpr,
		private readonly e2: RegExpr) {}

	language(): Language {
		return unionLangs(this.e1.language(), this.e2.language());
	}
}

// e1 e2
class AndExpr implements RegExpr {
	constructor(private readonly e1: RegExpr,
		private readonly e2: RegExpr) {}

	language(): Language {
		return catLangs(this.e1.language(), this.e2.language());
	}
}

// e*
class StarExpr implements RegExpr {
	constructor(private readonly e: RegExpr) {}

	language(): Language {
		return starLang(this.e.language());
	}
}

}
