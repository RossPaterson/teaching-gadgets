// Scanner for recursive descent parser for regular expressions

export class CharScanner {
	private pos: number;

	constructor(private readonly str: string) {
		this.pos = 0;
	}

	get(): string {
		return this.pos < this.str.length ?
			this.str.charAt(this.pos) : '';
	}

	advance(): void {
		if (this.pos < this.str.length)
			this.pos++;
	}

	fail(msg: string): never {
		throw msg;
	}

	match(t: string): void {
		const c: string = this.get();
		if (c !== t)
			this.fail(`'${c}' found when expecting '${t}'`);
		this.advance();
	}
}

export function isAlphaNum(c: string): boolean {
	return 'a' <= c && c <= 'z' || 'A' <= c && c <= 'Z' ||
		'0' <= c && c <= '9';
}
