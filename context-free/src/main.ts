import { bulletList, findElement, findInputElement, removeChildren, simpleElement } from "./DOM";
import type { ParseResult } from "./Earley";
import { parse } from "./Earley";
import { Expansion } from "./Expansion";
import { Grammar } from "./Grammar";
import { GrammarProperties } from "./GrammarProperties";
import type { NonTerminalTree } from "./ParseTree";
import { compareNTs, drawTree } from "./ParseTree";
import { } from "./SVG";

// limit on the total size of trees when expanding the grammar
const LIMIT: number = 10000;

// pair of DOM elements holding a production
type ProductionSource = { lhs: HTMLInputElement, rhs: HTMLInputElement }

// collection of DOM elements holding a grammar and locations for output
export class GrammarExplorer {
	// locations for input of grammar
	private rules: Array<ProductionSource>;
	// locations for output
	private errors: HTMLElement;
	private gallery: HTMLElement;

	constructor(rules: Array<[string, string]>,
		errors: string, gallery: string) {
		this.rules = rules.map(ruleSources);
		this.errors = findElement(errors);
		this.gallery = findElement(gallery);
		const action = (e: KeyboardEvent) => {
			if (e.keyCode == 13)
				this.allDerivations();
		};
		for (const rule of this.rules)
			rule.rhs.onkeydown = action;
	}

	// fetch the grammar from the input elements
	getGrammar(): Grammar {
		let grammar = new Grammar();
		for (const rule of this.rules) {
			const lhs: string = rule.lhs.value;
			const rhs: string = rule.rhs.value;
			if (lhs !== "")
				for (const prod of parseRHS(rhs))
					grammar.addProduction(lhs, prod);
		}
		return grammar;
	}

	// place any grammar issues in the error element
	reportIssues(issues: Array<string>): void {
		removeChildren(this.errors);
		if (issues.length > 0) {
			this.errors.appendChild(simpleElement("p", "This grammar has the following problems:"));
			this.errors.appendChild(bulletList(issues));
		}
	}

	// put the caption and trees in the gallery
	setTreeGallery(caption: string, trees: Array<NonTerminalTree>) {
		const target = this.gallery;
		removeChildren(target);
		target.appendChild(simpleElement("h2", caption));
		trees.sort(compareNTs);
		for (const tree of trees)
			target.appendChild(drawTree(tree));
	}

	// show all derivations in the gallery
	allDerivations(): void {
		const grammar: Grammar = this.getGrammar();
		this.reportIssues(grammarIssues(grammar));

		const maxDepth = grammar.nonTerminals().length + 9;
		const lgges = new Expansion(grammar, LIMIT);
		lgges.expandToDepth(maxDepth);
		const trees: Array<NonTerminalTree> =
			lgges.derivations(grammar.getStart());

		const caption: string =
			lgges.complete() ? "All derivation trees" :
			"Derivation trees of depth at most " + lgges.depth();
		this.setTreeGallery(caption, trees);
	}
}

function ruleSources([lhs, rhs]: [string, string]): ProductionSource {
	return { lhs: findInputElement(lhs), rhs: findInputElement(rhs) };
}

export class SentenceParser {
	private sentence: HTMLInputElement;

	constructor(private grammarSrc: GrammarExplorer, sentence: string) {
		this.sentence = findInputElement(sentence);
		this.sentence.onkeydown = (e: KeyboardEvent) => {
			if (e.keyCode == 13)
				this.deriveSentence();
		};
	}

	// show derivations of the sentence in the gallery
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
		this.grammarSrc.setTreeGallery(caption, result.trees);
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
	const properties = new GrammarProperties(g);
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

(window as any).GrammarExplorer = GrammarExplorer;
(window as any).SentenceParser = SentenceParser;
