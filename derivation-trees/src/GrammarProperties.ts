/// <reference path="Grammar.ts" />
/// <reference path="Queue.ts" />

function addAll<A>(s: Set<A>, vs: Iterable<A>): void {
	for (const v of vs)
		s.add(v);
}

// Statically computable properties of a grammar
class GrammarProperties {
	private grammar: Grammar;
	private unreachable: Set<string>;
	private unrealizable: Set<string>;
	private nullable: Set<string>;
	private cyclic: Set<string>;

	constructor(grammar: Grammar) {
		this.grammar = grammar;
		this.unreachable = this.computeUnreachable();
		this.unrealizable = this.computeUnrealizable();
		this.nullable = this.computeNullable();
		this.cyclic = this.computeCyclic();
	}

	// Nonterminals that cannot be reached from the start symbol
	getUnreachable(): Set<string> { return this.unreachable; }

	// Nonterminals that do not generate any strings
	getUnrealizable(): Set<string> { return this.unrealizable; }

	// Nonterminals that can generate the null string
	getNullable(): Set<string> { return this.nullable; }

	// Nonterminals that can derive themselves
	getCyclic(): Set<string> { return this.cyclic; }

	// Some strings have infinitely many derivations.
	// This occurs if and only if a cyclic nonterminal is both
	// reachable and realizable.
	infinitelyAmbiguous(): boolean {
		for (const nt of this.cyclic)
			if (! this.unreachable.has(nt) &&
			    ! this.unrealizable.has(nt))
				return true;
		return false;
	}

	private computeUnreachable(): Set<string> {
		let reachable = new Set<string>();
		let queue = new Queue<string>();
		queue.add(this.grammar.getStart());
		while (! queue.isEmpty()) {
			const nt: string = queue.remove();
			if (! reachable.has(nt)) {
				reachable.add(nt);
				for (const rhs of this.grammar.expansions(nt))
					for (const sym of rhs)
						if (this.grammar.isNonTerminal(sym))
							queue.add(sym);
			}
		}
		return this.complement(reachable);
	}

	private computeUnrealizable(): Set<string> {
		let unrealizable = new Set<string>(this.grammar.nonTerminals());
		const isRealizable = function (sym: string) {
			return ! unrealizable.has(sym);
		};
		const allRealizable = function (rhs: Array<string>) {
			 return rhs.every(isRealizable);
		};

		let changed: boolean = true;
		while (changed) {
			changed = false;
			for (const nt of unrealizable)
				if (this.grammar.expansions(nt).some(allRealizable)) {
					unrealizable.delete(nt);
					changed = true;
					break;
				}
		}
		return unrealizable;
	}

	private computeNullable(): Set<string> {
		let nullable = new Set<string>();
		const isNullable = function (sym: string) {
			return nullable.has(sym);
		};
		const allNullable = function (rhs: Array<string>) {
			 return rhs.every(isNullable);
		};

		let changed: boolean = true;
		while (changed) {
			changed = false;
			for (const nt of this.grammar.nonTerminals())
				if (! nullable.has(nt) &&
				    this.grammar.expansions(nt).some(allNullable)) {
					nullable.add(nt);
					changed = true;
					break;
				}
		}
		return nullable;
	}

	private computeCyclic(): Set<string> {
		let trivialExpansion = new Map<string, Set<string>>();
		for (const nt of this.grammar.nonTerminals()) {
			let s = new Set<string>();
			for (const rhs of this.grammar.expansions(nt)) {
				let nonNullCount: number = 0;
				for (let sym of  rhs)
					if (! this.nullable.has(sym))
						nonNullCount++;
				if (nonNullCount === 0)
					addAll(s, rhs);
				else if (nonNullCount === 1)
					for (const sym of rhs)
						if (this.grammar.isNonTerminal(sym) &&
						    ! this.nullable.has(sym))
							s.add(sym);
			}
			if (s.size !== 0)
				trivialExpansion.set(nt, s);
		}

		// transitive closure
		let changed: boolean = true;
		while (changed) {
			changed = false;
			for (const nt of trivialExpansion.keys()) {
				let exp: Set<string> = trivialExpansion.get(nt)!;
				const expClone: Array<string> = Array.from(exp);
				for (const target of expClone) {
					const extra = trivialExpansion.get(target);
					if (extra)
						addAll(exp, extra);
				}
				if (exp.size > expClone.length)
					changed = true;
			}
		}

		let cyclic = new Set<string>();
		for (const [nt, exp] of trivialExpansion.entries())
			if (exp.has(nt))
				cyclic.add(nt);
		return cyclic;
	}

	private complement(s: Set<string>): Set<string> {
		let rest = new Set<string>();
		for (const nt of this.grammar.nonTerminals())
			if (! s.has(nt))
				rest.add(nt);
		return rest;
	}

}
