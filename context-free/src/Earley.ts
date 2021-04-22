import type { Grammar } from "./Grammar";
import type { List } from "./List";
import { cons, equalList } from "./List";
import type { ParseTree } from "./ParseTree";
import { NonTerminalTree, TerminalTree, equalTree } from "./ParseTree";
import { Queue } from "./Queue";

function precondition(cond: boolean): void {
	if (! cond)
		throw "precondition does not hold";
}

function newArray<T>(n: number): Array<Array<T>> {
	let arr: Array<Array<T>> = [];
	for (let i: number = 0; i < n; i++)
		arr.push([]);
	return arr;
}

function equalArray<T>(a: Array<T>, b: Array<T>) {
	return a === b ||
		a.length === b.length && a.every((v, i) => v === b[i]);
}

// An item of the form A -> u.v, where A -> uv is a production in the grammar.
// This implementation scans from right to left, building a list of
// parse trees corresponding to the symbols of v.
class EarleyItem {
	constructor(
		// nonterminal of the left of the production
		private readonly nt: string,
		//right-hand side of the production
		private readonly rhs: Array<string>,
		// position in rhs, between 0 and rhs.length
		private readonly pos: number,
		// rhs.length-pos parse trees
		private readonly parsed: List<ParseTree>,
		// position in the input string of the end of the item
		private readonly finish: number) {}

	// advance of item, given a parse tree for the nonterminal on
	// the left of the dot
	advance(t: ParseTree): EarleyItem {
		precondition(! this.finished());
		return new EarleyItem(this.nt, this.rhs, this.pos - 1,
			cons(t)(this.parsed), this.finish);
	}

	equals(o: EarleyItem): boolean {
		return o === this ||
			this.finish === o.finish && this.pos === o.pos &&
			this.nt === o.nt && equalArray(this.rhs, o.rhs) &&
			equalList(equalTree, this.parsed, o.parsed);
	}

	// Have we matched the whole of the rhs?
	finished(): boolean { return this.pos === 0; }

	// Have we matched the whole of the rhs for the specified nonterminal?
	finishedWith(nt: string): boolean {
		return this.pos === 0 && this.nt === nt;
	}

	// Does the given terminal occur immediately to the left of the dot?
	match(tsym: string): boolean {
		return this.pos > 0 && this.rhs[this.pos-1] === tsym;
	}

	// The symbol immediately to the left of the dot
	current(): string {
		precondition(! this.finished());
		return this.rhs[this.pos-1];
	}

	// position in the input string immediately to te right of this item
	start(): number { return this.finish; }

	// parse tree for a completed production
	complete(): NonTerminalTree {
		precondition(this.finished());
		return new NonTerminalTree(this.nt, this.parsed);
	}

	// parse tree for a completed production of the start symbol
	completeTop(): NonTerminalTree {
		precondition(this.finished());
		if (this.parsed === null)
			throw "requires non-empty list";
		precondition(this.parsed.tail === null);
		return this.parsed.head as NonTerminalTree;
	}
}

// item at end of a rhs
function endItem(nt: string, rhs: Array<string>, finish: number): EarleyItem {
	return new EarleyItem(nt, rhs, rhs.length, null, finish);
}

// additional start nonterminal, with a unit production S' -> S
const START: string = "Start";

const EXPANSION_LIMIT: number = 100;

export type ParseResult = {
	complete: boolean, // all possible parses are included in trees
	trees: Array<NonTerminalTree> // possible parses
	};

export function parse(grammar: Grammar, input: Array<string>): ParseResult {
	let states: Array<Array<EarleyItem>> =
		newArray(input.length+1);

	let truncated: boolean = false;
	for (let pos: number = input.length; pos >= 0; pos--) {
		let queue = new Queue<EarleyItem>();
		if (pos === input.length) {
			// initial state (starting from end of string)
			queue.add(endItem(START,
				[grammar.getStart()], pos));
		} else {
			// scan a terminal symbol
			const nextSym: string = input[pos];
			if (grammar.isTerminal(nextSym)) {
				const t = new TerminalTree(nextSym);
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
			if (! state.some((s) => s.equals(item))) {
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
					if (grammar.isNonTerminal(nt)) {
						for (const rhs of grammar.expansions(nt))
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
