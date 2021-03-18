/// <reference path="DOM.ts" />
/// <reference path="Earley.ts" />
/// <reference path="Expansion.ts" />
/// <reference path="Grammar.ts" />
/// <reference path="GrammarProperties.ts" />
/// <reference path="ParseTree.ts" />
/// <reference path="SVG.ts" />

function symList(s: string): Array<string> {
	let cs = [];
	for (let i = 0; i < s.length; i++) {
		let c: string = s.charAt(i);
		if (c !== ' ')
			cs.push(c);
	}
	return cs
}

function parseRHS(rhs: string): Array<Array<string>> {
	const strs: Array<string> = rhs.split("|");
	let rs: Array<Array<string>> = [];
	for (let s of strs)
		rs.push(symList(s));
	return rs;
}

function getGrammar(): Grammar {
	let grammar: Grammar = new Grammar();
	for (let i: number = 1; i <= 10; i++) {
		const lhs: string = getParameter("lhs" + i);
		const rhs: string = getParameter("rhs" + i);
		if (lhs !== "") {
			const prods: Array<Array<string>> = parseRHS(rhs);
			for (let i in prods)
				grammar.addProduction(lhs, prods[i]);
		}
	}
	return grammar;
}

const LIMIT: number = 10000;

function allDerivations(): void {
	const grammar: Grammar = getGrammar();

	checkGrammar(grammar);

	const maxDepth: number = grammar.nonTerminals().length + 9;
	let lgges: Expansion = new Expansion(grammar, LIMIT);
	lgges.expandToDepth(maxDepth);
	let trees: Array<NonTerminalTree> =
		lgges.derivations(grammar.getStart());

	const caption: string = lgges.complete() ? "All derivation trees" :
		"Derivation trees of depth at most " + lgges.depth();
	treeGallery(caption, trees);
}

function deriveSentence(): void {
	const grammar: Grammar = getGrammar();
	const sentence: string = getParameter("sentence");

	checkGrammar(grammar);

	let parser: Earley = new Earley(grammar);
	let result: ParseResult = parser.parse(symList(sentence));

	const caption: string = (! result.complete ? "Some of the derivations" :
		result.trees.length == 0 ? "There are no derivations" :
		result.trees.length == 1 ? "Derivation tree" :
			"Derivation trees") + " for '" + sentence + "'";
	treeGallery(caption, result.trees);
}

function checkGrammar(g: Grammar): void {
	let properties: GrammarProperties = new GrammarProperties(g);
	let issues: Array<string> = [];
        let unreachable: Set<string> = properties.getUnreachable();
        let unrealizable: Set<string> = properties.getUnrealizable();
        let cyclic: Set<string> = properties.getCyclic();
	if (unreachable.size > 0)
		issues.push(subjectNTs(unreachable) +
			"unreachable from the start symbol " + g.getStart() + ".");
	if (unrealizable.size > 0)
		issues.push(subjectNTs(unrealizable) +
			"unrealizable (cannot generate any strings).");
	if (cyclic.size > 0)
		issues.push(subjectNTs(cyclic) +
			(properties.infinitelyAmbiguous() ?
				"cyclic, so some strings have infinitely many derivations" : "cyclic") + ".");

	const problems: HTMLElement | null = document.getElementById("problems");
	if (problems) {
		removeChildren(problems);
		if (issues.length > 0) {
			problems.appendChild(simpleElement("p", "This grammar has the following problems:"));
			problems.appendChild(bulletList(issues));
		}
	}
}

function subjectNTs(nts: Set<string>): string {
	let str: string = nts.size > 1 ? "Nonterminals " : "Nonterminal ";
	let first: boolean = true;
	for (let nt of nts.values())
		if (first) {
			str = str + nt;
			first = false;
		} else
			str = str + ", " + nt;
	str = str + (nts.size > 1 ? " are " : " is ");
	return str;
}

function treeGallery(caption: string, trees: Array<NonTerminalTree>): void {
	const gallery: HTMLElement | null = document.getElementById("gallery");
	if (gallery) {
		removeChildren(gallery);
		gallery.appendChild(simpleElement("h2", caption));
		trees.sort(compareNTs);
		for (let tree of trees)
			gallery.appendChild(drawTree(tree));
	}
}
