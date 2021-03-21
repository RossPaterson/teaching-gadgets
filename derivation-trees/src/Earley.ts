/// <reference path="Grammar.ts" />
/// <reference path="List.ts" />
/// <reference path="ParseTree.ts" />
/// <reference path="Queue.ts" />

function equalArray<T>(a: Array<T>, b: Array<T>) {
	if (a === b)
		return true;
	if (a.length != b.length)
		return false;
	for (const i in a)
		if (a[i] !== b[i])
			return false;
	return true;
}

// scanning right to left
class EarleyItem {
	constructor(private readonly nt: string,
		private readonly parsed: List<ParseTree>,
		private readonly rhs: Array<string>, // position in rhs
		private readonly pos: number,
		private readonly finish: number) {}

	// advance of item
	advance(t: ParseTree): EarleyItem {
		if (this.finished())
			throw "advancing at end";
		return new EarleyItem(this.nt,
			new Cons<ParseTree>(t, this.parsed),
			this.rhs, this.pos - 1, this.finish);
	}

	equals(o: EarleyItem): boolean {
		if (o === this)
			return true;
		return this.finish === o.finish && this.pos === o.pos &&
			this.nt === o.nt && equalArray(this.rhs, o.rhs) &&
			equalList(this.parsed, o.parsed);
	}

	finished(): boolean { return this.pos === 0; }

	finishedWith(nt: string): boolean {
		return this.pos === 0 && this.nt === nt;
	}

	match(sym: string): boolean {
		return this.pos > 0 && this.rhs[this.pos-1] === sym;
	}

	current(): string {
		if (this.finished())
			throw "current at end";
		return this.rhs[this.pos-1];
	}

	complete(): NonTerminalTree {
		if (! this.finished())
			throw "not complete";
		return new NonTerminalTree(this.nt, this.parsed);
	}

	start(): number { return this.finish; }

	completeTop(): NonTerminalTree {
		if (! this.finished())
			throw "current at end";
		if (this.parsed === null)
			throw "null list";
		if (this.parsed.tail !== null)
			throw "non-singleton list";
		return this.parsed.head as NonTerminalTree;
	}
}

// item at end of a rhs
function endItem(nt: string, rhs: Array<string>, finish: number): EarleyItem {
	return new EarleyItem(nt, null, rhs, rhs.length, finish);
}

const START: string = "Start";
const EXPANSION_LIMIT: number = 100;

type ParseResult = {
	complete: boolean,
	trees: Array<NonTerminalTree>
	};

class Earley {
	constructor(private readonly grammar: Grammar) {}

	parse(input: Array<string>): ParseResult {
		let states: Array<Array<EarleyItem>> = [];
		for (let i: number = 0; i <= input.length; i++)
			states.push([]);

		let truncated: boolean = false;
		for (let pos: number = input.length; pos >= 0; pos--) {
			let queue = new Queue<EarleyItem>();
			if (pos === input.length) {
				// initial state (starting from end of string)
				const rhs0: Array<string> =
					[this.grammar.getStart()];
				queue.add(endItem(START, rhs0, pos));
			} else {
				// scan a terminal symbol
				const nextSym: string = input[pos];
				if (this.grammar.isTerminal(nextSym)) {
					const t: TerminalTree = new TerminalTree(nextSym);
					for (const item of states[pos+1])
						if (item.match(nextSym))
							queue.add(item.advance(t));
				}
			}

			const state: Array<EarleyItem> = states[pos];
			let empties: Array<NonTerminalTree> = [];
			while (! queue.isEmpty()) {
				// guard against unlimited expansion
				if (state.length > EXPANSION_LIMIT) {
					truncated = true;
					break;
				}
				const item: EarleyItem = queue.remove();
				let seen: boolean = false;
				for (const s of state)
					if (s.equals(item)) {
						seen = true;
						break;
					}
				if (! seen) {
					state.push(item);
					// expand the item
					if (item.finished()) {
						// complete a production
						const t: NonTerminalTree = item.complete();
						const nt: string = t.nonTerminal();
						const end: number = item.start();
						if (end === pos)
							// null expansions need special treatment
							empties.push(t);
						for (const prev of states[end])
							if (prev.match(nt))
								queue.add(prev.advance(t));
					} else {
						// predict: expand a nonterminal
						const nt: string = item.current();
						if (this.grammar.isNonTerminal(nt)) {
							const rhss: Array<Array<string>> = this.grammar.expansions(nt);
							for (const rhs of rhss)
								queue.add(endItem(nt, rhs, pos));
							for (const t of empties)
								if (t.nonTerminal() === nt)
									queue.add(item.advance(t));
						}
					}
				}
			}
			states[pos] = state;
		}

		let trees: Array<NonTerminalTree> = [];
		for (const item of states[0])
			if (item.finishedWith(START))
				trees.push(item.completeTop());
		return { complete: ! truncated, trees: trees };
	}
}
