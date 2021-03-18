class Grammar {
	private lhss: Array<string>;
	private productions: Map<string, Array<Array<string>>>;

	constructor() {
		this.lhss = [];
		this.productions = new Map();
	}

	addProduction(lhs: string, rhs: Array<string>): void {
		let entry = this.productions.get(lhs);
		if (entry) {
			entry.push(rhs);
		} else {
			this.lhss.push(lhs);
			this.productions.set(lhs, [rhs]);
		}
	}

	getStart(): string { return this.lhss[0]; }

	nonTerminals(): Array<string> { return this.lhss; }

	expansions(nt: string): Array<Array<string>> | undefined {
		return this.productions.get(nt);
	}
}
