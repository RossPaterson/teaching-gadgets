/// <reference path="Language.ts" />
/// <reference path="Parser.ts" />
/// <reference path="RegExpr.ts" />
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
		text = showLanguage(150, parseRegExpr(re_text));
	} catch (err) {
		text = `<em>Malformed expression: ${err}</em>`;
	}
	(document.getElementById(element_id) as HTMLElement).innerHTML = text;
}

// String representing the language denoted by e, of length at most n (approx)
function showLanguage(n: number, e: RegExpr): string {
	let ss: Array<string> = [];
	for (const s of strings(language(e))) {
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

const language: (e: RegExpr) => Language = foldRegExpr({
	emptyExpr: emptyString,
	singleExpr: singleLetter,
	orExpr: unionLangs,
	andExpr: catLangs,
	starExpr: starLang
	});

} // namespace Regex

import regexLanguage = Regex.regexLanguage;
