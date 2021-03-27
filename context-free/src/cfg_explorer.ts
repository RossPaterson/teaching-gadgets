/// <reference path="DOM.ts" />
/// <reference path="Earley.ts" />
/// <reference path="Expansion.ts" />
/// <reference path="Grammar.ts" />
/// <reference path="GrammarProperties.ts" />
/// <reference path="ParseTree.ts" />
/// <reference path="SVG.ts" />

namespace CFG {

// execute the action if return is typed in the named field
export function addReturnAction(name: string, action: () => void): void {
	const element: HTMLElement | null = document.getElementById(name);
	if (element)
		element.onkeydown = function (e) {
			if (e.keyCode == 13)
				action();
		};
}

const LIMIT: number = 10000;

export function allDerivations(): void {
	const grammar: Grammar = getGrammar();

	checkGrammar(grammar);

	const maxDepth: number = grammar.nonTerminals().length + 9;
	const lgges: Expansion = new Expansion(grammar, LIMIT);
	lgges.expandToDepth(maxDepth);
	const trees: Array<NonTerminalTree> =
		lgges.derivations(grammar.getStart());

	const caption: string = lgges.complete() ? "All derivation trees" :
		"Derivation trees of depth at most " + lgges.depth();
	treeGallery(caption, trees);
}

export function deriveSentence(): void {
	const grammar: Grammar = getGrammar();
	const sentence: string = getParameter("sentence");

	checkGrammar(grammar);

	const parser: Earley = new Earley(grammar);
	const result: ParseResult = parser.parse(symList(sentence));

	const caption: string = (! result.complete ? "Some of the derivations" :
		result.trees.length == 0 ? "There are no derivations" :
		result.trees.length == 1 ? "Derivation tree" :
			"Derivation trees") + " for '" + sentence + "'";
	treeGallery(caption, result.trees);
}

function getGrammar(): Grammar {
	let grammar: Grammar = new Grammar();
	for (let i: number = 1; i <= 10; i++) {
		const lhs: string = getParameter("lhs" + i);
		const rhs: string = getParameter("rhs" + i);
		if (lhs !== "")
			for (const prod of parseRHS(rhs))
				grammar.addProduction(lhs, prod);
	}
	return grammar;
}

function parseRHS(rhs: string): Array<Array<string>> {
	return rhs.split("|").map(symList);
}

// individual characters of s, ignoring spaces
function symList(s: string): Array<string> {
	return Array.from(s).filter((c) => c !== ' ');
}

function checkGrammar(g: Grammar): void {
	const properties: GrammarProperties = new GrammarProperties(g);
	let issues: Array<string> = [];
        const unreachable: Set<string> = properties.getUnreachable();
        const unrealizable: Set<string> = properties.getUnrealizable();
        const cyclic: Set<string> = properties.getCyclic();
	if (unreachable.size > 0)
		issues.push(describeNTs(unreachable,
			"unreachable from the start symbol " + g.getStart()));
	if (unrealizable.size > 0)
		issues.push(describeNTs(unrealizable,
			"unrealizable (cannot generate any strings)"));
	if (cyclic.size > 0)
		issues.push(describeNTs(cyclic,
			properties.infinitelyAmbiguous() ?
				"cyclic, so some strings have infinitely many derivations" : "cyclic"));

	const problems: HTMLElement | null = document.getElementById("problems");
	if (problems) {
		removeChildren(problems);
		if (issues.length > 0) {
			problems.appendChild(simpleElement("p", "This grammar has the following problems:"));
			problems.appendChild(bulletList(issues));
		}
	}
}

// Sentence saying a nonempty set of nonterminals have a property
function describeNTs(nts: Set<string>, adjective: string): string {
	const plural: boolean = nts.size > 1;
	return (plural ? "Nonterminals " : "Nonterminal ") +
		Array.from(nts).join(", ") +
		(plural ? " are " : " is ") +
		adjective + ".";
}

function treeGallery(caption: string, trees: Array<NonTerminalTree>): void {
	const gallery: HTMLElement | null = document.getElementById("gallery");
	if (gallery) {
		removeChildren(gallery);
		gallery.appendChild(simpleElement("h2", caption));
		trees.sort(compareNTs);
		for (const tree of trees)
			gallery.appendChild(drawTree(tree));
	}
}

} // namespace CFG
