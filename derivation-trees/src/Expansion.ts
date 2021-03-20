/// <reference path="Grammar.ts" />
/// <reference path="List.ts" />
/// <reference path="ParseTree.ts" />

class Expansion {
	private grammar: Grammar;
	private limit: number;

	private lgges: Map<string, Array<NonTerminalTree>>;
	private count: number;
	private expandCount: number;
	private finished: boolean;

	// Empty language for each nonterminal
	constructor(grammar: Grammar, limit: number) {
		this.grammar = grammar;
		this.limit = limit;

		this.count = 0;
		this.expandCount = 0;
		this.finished = false;
		this.lgges = new Map<string, Array<NonTerminalTree>>();
		for (const nt of grammar.nonTerminals())
			this.lgges.set(nt, []);
	}

	// Given a set of trees up to depth n, update to trees up to depth n+1
	expand(): boolean {
		let new_lgges = new Map<string, Array<NonTerminalTree>>();
		for (const nt of this.grammar.nonTerminals()) {
			let ts: Array<NonTerminalTree> = [];
			for (const rhs of this.grammar.expansions(nt)) {
				const strs: Array<List<ParseTree>> =
					this.expandSymbols(rhs);
				for (const str of strs) {
					const t: NonTerminalTree = new NonTerminalTree(nt, Array.from(elements(str)));
					ts.push(t);
					this.count += t.height()*t.width();
					if (this.count > this.limit)
						return false;
				}
			}
			new_lgges.set(nt, ts);
		}
		let prev_size: number = this.size();
		this.lgges = new_lgges;
		this.expandCount++;
		if (this.size() === prev_size)
			this.finished = true;
		return true;
	}

	private expandSymbols(syms: Array<string>): Array<List<ParseTree>> {
		let strs: Array<List<ParseTree>> = [null]
		for (let i: number = syms.length - 1; i >= 0; i--)
			strs = this.expandSymbol(syms[i], strs);
		return strs
	}

	private expandSymbol(sym: string, strs: Array<List<ParseTree>>): Array<List<ParseTree>> {
		if (this.grammar.isTerminal(sym)) {
			const t: ParseTree = new TerminalTree(sym);
			return strs.map(cons(t));
		} else {
			const exps: Array<NonTerminalTree> = this.lgges.get(sym)!;
			let new_strs: Array<List<ParseTree>> = [];
			for (const t of exps)
				for (const str of strs)
					new_strs.push(new Cons<ParseTree>(t, str));
			return new_strs;
		}
	}

	expandToDepth(maxDepth: number): void {
		while (this.expandCount < maxDepth &&
		       ! this.finished && this.expand())
			;
	}

	derivations(nt: string): Array<NonTerminalTree> {
		return this.lgges.get(nt)!;
	}

	depth(): number { return this.expandCount; }

	size(): number {
		let n: number = 0;
		for (const nt of this.grammar.nonTerminals())
			n = n + this.derivations(nt).length;
		return n;
	}

	complete(): boolean { return this.finished; }
}
