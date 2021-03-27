/// <reference path="Language.ts" />
/// <reference path="Parser.ts" />
/// <reference path="RegExpr.ts" />
namespace Regex {

// Mapping a regular expression to a summary of the corresponding language.
//
// Input fields accept basic regular expressions with alphanumeric
// characters and meta-characters |, *, ( and ).

// New interface:
// Update the language in the target element whenever return is typed in
// in the source input element.
//
// Example usage:
// <input id="regex-id" type="text" size="15" value="" />
// <p id="language-id"></p>
// <script>regexAndLanguage("regex-id", "language-id");</script>
export function regexAndLanguage(source: string, target: string): void {
        const src_element: HTMLElement | null = document.getElementById(source);
        if (src_element === null)
		throw (`No "${source}" element`);
	if (! (src_element instanceof HTMLInputElement))
		throw (`"${source}" is not an input element`)

        const tgt_element: HTMLElement | null = document.getElementById(target);
        if (tgt_element === null)
		throw (`No "${target}" element`);

	src_element.onkeydown = function (e: KeyboardEvent) {
		if (e.keyCode == 13)
			tgt_element.innerHTML =
				languageString(src_element.value);
	};
}

// Old interface:
// Set content of the identified DOM element to the language denoted by
// the regular expression text.
//
// Example usage:
// <input type="text" size="15" value="" onchange="regexLanguage('target-id', this.value);"/>
// <p id="target-id"></p>
export function regexLanguage(element_id: string, re_text: string): void {
	(document.getElementById(element_id) as HTMLElement).innerHTML =
		languageString(re_text);
}

// approximate limit on the length of the language string
const LANG_LIMIT: number = 150;

// String representing the set of strings denoted by the regular
// expression in re_text, truncated to appromimately LANG_LIMIT characters
function languageString(re_text: string): string {
	let e: RegExpr;
	try {
		e = parseRegExpr(re_text);
	} catch (err) {
		return `<em class="error">Malformed expression: ${err}</em>`;
	}

	let n: number = LANG_LIMIT;
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

// The regular language denoted by a regular expression
const language: (e: RegExpr) => Language = foldRegExpr({
	emptyExpr: emptyString,
	singleExpr: singleLetter,
	orExpr: unionLangs,
	andExpr: catLangs,
	starExpr: starLang
	});

} // namespace Regex

import regexAndLanguage = Regex.regexAndLanguage;
import regexLanguage = Regex.regexLanguage;
