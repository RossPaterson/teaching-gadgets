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
		for (let nt of grammar.nonTerminals())
			this.lgges.set(nt, []);
	}

	// Given a set of trees up to depth n, update to trees up to depth n+1
	expand(): boolean {
		let new_lgges = new Map<string, Array<NonTerminalTree>>();
		for (let nt of this.grammar.nonTerminals()) {
			let ts: Array<NonTerminalTree> = [];
			for (let rhs of this.grammar.expansions(nt)!) {
				let strs: Array<List<ParseTree>> = [null]
				for (let i: number = rhs.length - 1; i >= 0; i--) {
					let sym: string = rhs[i];
					let exps: Array<NonTerminalTree> | undefined = this.lgges.get(sym);
					if (exps === undefined) { // terminal
						let t: ParseTree = new TerminalTree(sym);
						strs = strs.map(cons(t));
					} else {
						let new_strs: Array<List<ParseTree>> = [];
						for (let t of exps)
							for (let str of strs)
								new_strs.push(new Cons<ParseTree>(t, str));
						strs = new_strs;
					}
				}
				for (let str of strs) {
					let t: NonTerminalTree = new NonTerminalTree(nt, arrayOf(str));
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
		for (let nt of this.grammar.nonTerminals())
			n = n + this.derivations(nt).length;
		return n;
	}

	complete(): boolean { return this.finished; }
}
