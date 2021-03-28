/// <reference path="DOM.ts" />
/// <reference path="Earley.ts" />
/// <reference path="Expansion.ts" />
/// <reference path="Grammar.ts" />
/// <reference path="GrammarProperties.ts" />
/// <reference path="ParseTree.ts" />
/// <reference path="SVG.ts" />

namespace CFG {

// limit on the total size of trees when expanding the grammar
const LIMIT: number = 10000;

type ProductionSource = { lhs: HTMLInputElement, rhs: HTMLInputElement }

export class GrammarExplorer {
	private rules: Array<ProductionSource>;
	private errors: HTMLElement;
	private gallery: HTMLElement;

	constructor(rules: Array<[string, string]>,
		errors: string, gallery: string) {
		this.rules = rules.map(ruleSources);
		this.errors = findElement(errors);
		this.gallery = findElement(gallery);
		const src = this;
		const action = function (e: KeyboardEvent): void {
			if (e.keyCode == 13)
				src.allDerivations();
		};
		for (const rule of this.rules)
			rule.rhs.onkeydown = action;
	}

	getGrammar(): Grammar {
		let grammar: Grammar = new Grammar();
		for (const rule of this.rules) {
			const lhs: string = rule.lhs.value;
			const rhs: string = rule.rhs.value;
			if (lhs !== "")
				for (const prod of parseRHS(rhs))
					grammar.addProduction(lhs, prod);
		}
		return grammar;
	}

	reportIssues(issues: Array<string>): void {
		removeChildren(this.errors);
		if (issues.length > 0) {
			this.errors.appendChild(simpleElement("p", "This grammar has the following problems:"));
			this.errors.appendChild(bulletList(issues));
		}
	}

	allDerivations(): void {
		const grammar: Grammar = this.getGrammar();
		this.reportIssues(grammarIssues(grammar));

		const maxDepth: number = grammar.nonTerminals().length + 9;
		const lgges: Expansion = new Expansion(grammar, LIMIT);
		lgges.expandToDepth(maxDepth);
		const trees: Array<NonTerminalTree> =
			lgges.derivations(grammar.getStart());

		const caption: string =
			lgges.complete() ? "All derivation trees" :
			"Derivation trees of depth at most " + lgges.depth();
		setTreeGallery(caption, trees, this.gallery);
	}
}

function ruleSources([lhs, rhs]: [string, string]): ProductionSource {
	return { lhs: findInputElement(lhs), rhs: findInputElement(rhs) };
}

export class SentenceParser {
	private sentence: HTMLInputElement;
	private gallery: HTMLElement;

	constructor(private grammarSrc: GrammarExplorer,
		sentence: string, gallery: string) {
		this.sentence = findInputElement(sentence);
		this.gallery = findElement(gallery);
		const src = this;
		this.sentence.onkeydown = function (e: KeyboardEvent): void {
			if (e.keyCode == 13)
				src.deriveSentence();
		};
	}

	deriveSentence(): void {
		const grammar: Grammar = this.grammarSrc.getGrammar();
		this.grammarSrc.reportIssues(grammarIssues(grammar));

		const sentence: string = this.sentence.value;
		const result: ParseResult = parse(grammar, symList(sentence));

		const caption: string = (
			! result.complete ? "Some of the derivations" :
			result.trees.length == 0 ? "There are no derivations" :
			result.trees.length == 1 ? "Derivation tree" :
				"Derivation trees") + " for '" + sentence + "'";
		setTreeGallery(caption, result.trees, this.gallery);
	}
}

function parseRHS(rhs: string): Array<Array<string>> {
	return rhs.split("|").map(symList);
}

// individual characters of s, ignoring spaces
function symList(s: string): Array<string> {
	return Array.from(s).filter((c) => c !== ' ');
}

function grammarIssues(g: Grammar): Array<string> {
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
	return issues;
}

// Sentence saying a nonempty set of nonterminals have a property
function describeNTs(nts: Set<string>, adjective: string): string {
	const plural: boolean = nts.size > 1;
	return (plural ? "Nonterminals " : "Nonterminal ") +
		Array.from(nts).join(", ") +
		(plural ? " are " : " is ") +
		adjective + ".";
}

function setTreeGallery(caption: string, trees: Array<NonTerminalTree>, target: HTMLElement): void {
	removeChildren(target);
	target.appendChild(simpleElement("h2", caption));
	trees.sort(compareNTs);
	for (const tree of trees)
		target.appendChild(drawTree(tree));
}

} // namespace CFG
