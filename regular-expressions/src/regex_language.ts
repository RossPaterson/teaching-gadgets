/// <reference path="CharScanner.ts" />
/// <reference path="Language.ts" />
namespace Regex {

// Set content of the identified DOM element to the language denoted by
// the regular expression text.
//
// Example usage:
// <input type="text" size="15" value="" onchange="regexLanguage('target-id', this.value);"/>
// <p id="target-id"></p>
//
// The input field accepts basic regular expressions with alphanumeric
// characters and meta-characters |, *, ( and ).
export function regexLanguage(element_id: string, re_text: string): void {
	let text: string = "";
	try {
		text = showLanguage(150, allExpr(new CharScanner(re_text)));
	} catch (err) {
		text = `<em>Malformed expression: ${err}</em>`;
	}
	(document.getElementById(element_id) as HTMLElement).innerHTML = text;
}

// String representing the language denoted by e, of length at most n (approx)
function showLanguage(n: number, e: Regexp): string {
	let ss: Array<string> = [];
	for (const s of strings(e.language())) {
		n -= s.length + 2;
		if (n < 0) {
			ss.push("...");
			break;
		}
		ss.push(s);
	}
	if (ss[0] === "")
		ss[0] = "ε";
	return `{ ${ss.join(", ")} }`;
}

// whole string as a regular expression
function allExpr(scanner: CharScanner): Regexp {
	const e: Regexp = expr(scanner);
	if (scanner.get() !== '')
		scanner.fail(`unexpected '${scanner.get()}'`);
	return e;
}

// e = t ('|' t)*
function expr(scanner: CharScanner): Regexp {
	let e: Regexp = term(scanner);
	while (scanner.get() === '|') {
		scanner.advance();
		e = new OrExpr(e, term(scanner));
	}
	return e;
}

// t = f*
function term(scanner: CharScanner): Regexp {
	let t: Regexp = new EmptyExpr();
	let c: string = scanner.get();
	while (c === '(' || isAlphaNum(c) || c === 'ε') {
		t = new AndExpr(t, factor(scanner));
		c = scanner.get();
	}
	return t;
}

function factor(scanner: CharScanner): Regexp {
	let c: string = scanner.get();
	let f: Regexp;
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

interface Regexp {
	language(): Language;
}

// empty string
class EmptyExpr implements Regexp {
	constructor() {}

	language(): Language {
		return emptyString();
	}
}

// single character
class SingleExpr implements Regexp {
	constructor(private readonly c: string) {}

	language(): Language {
		return singleLetter(this.c);
	}
};

// e1 | e2
class OrExpr implements Regexp {
	constructor(private readonly e1: Regexp,
		private readonly e2: Regexp) {}

	language(): Language {
		return unionLangs(this.e1.language(), this.e2.language());
	}
}

// e1 e2
class AndExpr implements Regexp {
	constructor(private readonly e1: Regexp,
		private readonly e2: Regexp) {}

	language(): Language {
		return catLangs(this.e1.language(), this.e2.language());
	}
}

// e*
class StarExpr implements Regexp {
	constructor(private readonly e: Regexp) {}

	language(): Language {
		return starLang(this.e.language());
	}
}

} // namespace Regex

import regexLanguage = Regex.regexLanguage;
