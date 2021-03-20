/// <reference path="List.ts" />
/// <reference path="SVG.ts" />

const HSEP: number = 30;
const VSEP: number = 45;
const STRIP_HEIGHT: number = 30;
const TOP: number = 15;
const BOTTOM: number = 5;
const H_PADDING: number = 20;
const V_PADDING: number = 20;
const TERM_SYMBOL_COLOUR: string = "#0000cc";
const TERM_LINE_COLOUR: string = "#dddddd";
const NT_SYMBOL_COLOUR: string = "#cc0000";
const NT_LINE_COLOUR: string = "black";
const NT_NULL_COLOUR: string = "#aaaaaa";
const NT_NULL_SYMBOL: string = "ε";

abstract class ParseTree {
	constructor() {}

	abstract height(): number;
	abstract width(): number;
	abstract shortName(): string;

	abstract addSentence(s: string): string;
	abstract draw(out: Array<SVGElement>, x: number, y: number, levels: number): number;

	abstract equals(o: ParseTree): boolean;
}

class NonTerminalTree extends ParseTree {
	private sym: string;
	private children: List<ParseTree>;

	// derived values
	private ht: number;
	private wd: number;
	private sentence: string;

	constructor(sym: string, children: List<ParseTree>) {
		super();
		this.sym = sym;
		this.children = children;

		let h: number = 1;
		let w: number = 0;
		for (const t of elements(children)) {
			h = Math.max(h, t.height());
			w = w + t.width();
		}
		this.ht = h+1;
		this.wd = Math.max(1, w);

		this.sentence = this.addSentence("");
	}

	height(): number { return this.ht; }
	width(): number { return this.wd; }
	shortName(): string { return this.sym; }
	nonTerminal(): string { return this.sym; }

	equals(o: ParseTree): boolean {
		if (o === this)
			return true;
		if (! (o instanceof NonTerminalTree))
			return false;
		return this.sym == o.sym &&
			equalList(this.children, o.children);
	}

	getSentence(): string { return this.sentence; }

	addSentence(s: string): string {
		for (const t of elements(this.children))
			s = t.addSentence(s);
		return s;
	}

	draw(out: Array<SVGElement>, x: number, y: number, levels: number): number {
		let rx: number;
		const ty: number = y + VSEP;
		let trx: Array<number> = [];
		let n: number = 0;
		let tx: number = x;
		for (const t of elements(this.children)) {
			trx.push(t.draw(out, tx, ty, levels-1));
			n++;
			tx = tx + t.width()*HSEP;
		}
		if (n === 0) {
			rx = x;
		} else {
			// rx is median of subtree root x-coordinates
			rx = (trx[Math.floor((n-1)/2)] + trx[Math.floor(n/2)])/2;
		}
		out.push(text(rx, y, NT_SYMBOL_COLOUR, this.sym));
		if (n === 0) {
			out.push(text(x, ty, NT_NULL_COLOUR, NT_NULL_SYMBOL));
			out.push(lines(NT_NULL_COLOUR,
				[line(x, y+BOTTOM, x, ty-TOP)]));
		} else {
			let ls: Array<SVGElement> = [];
			tx = x;
			let i: number = 0;
			for (const t of elements(this.children)) {
				ls.push(line(rx, y+BOTTOM, trx[i], ty-TOP));
				i++;
				tx = tx + t.width()*HSEP;
			}
			out.push(lines(NT_LINE_COLOUR, ls));
		}
		return rx;
	}
}

class TerminalTree extends ParseTree {
	private sym: string;

	constructor(sym: string) { super(); this.sym = sym; }

	height(): number { return 1; }
	width(): number { return 1; }
	shortName(): string { return this.sym; }

	equals(o: ParseTree): boolean {
		if (o === this)
			return true;
		if (! (o instanceof TerminalTree))
			return false;
		return o.sym === this.sym;
	}

	addSentence(s: string): string {
		if (s.length === 0)
			return this.sym;
		return s + ' ' + this.sym;
	}

	draw(out: Array<SVGElement>, x: number, y: number, levels: number): number {
		// at current position in tree
		out.push(text(x, y, TERM_SYMBOL_COLOUR, this.sym));
		// directly below that and outside the box
		const ly: number = y + levels*VSEP - 10;
		out.push(text(x, ly, TERM_SYMBOL_COLOUR, this.sym));

		// grey line connecting them
		out.push(lines(TERM_LINE_COLOUR,
			[line(x, y + BOTTOM, x, ly - TOP)]));
		return x;
	}
}

function equalList(xs: List<ParseTree>, ys: List<ParseTree>): boolean {
	while (xs !== null) {
		if (ys === null)
			return false;
		if (xs === ys)
			return true;
		if (! xs.head.equals(ys.head))
			return false;
		xs = xs.tail;
		ys = ys.tail;
	}
	return ys === null;
}

// compare trees first by length, then by generated sentence
function compareNTs(a: NonTerminalTree, b: NonTerminalTree): number {
	const a_sentence: string = a.getSentence();
	const b_sentence: string = b.getSentence();
	if (a_sentence.length !== b_sentence.length)
		return a_sentence.length - b_sentence.length;
	if (a_sentence < b_sentence)
		return -1;
	if (a_sentence > b_sentence)
		return 1;
	return a.height() - b.height();
}

function drawTree(t: ParseTree): SVGElement {
	let es: Array<SVGElement> = []
	es.push(svgElement("rect", [
		numAttr("width", t.width()*HSEP),
		numAttr("height", t.height()*VSEP),
		attr("fill", "#fff7db")], []));
	es.push(svgElement("rect", [
		numAttr("y", t.height()*VSEP),
		numAttr("width", t.width()*HSEP),
		numAttr("height", STRIP_HEIGHT),
		attr("fill", "#f0e6bc")], []));
	t.draw(es, HSEP/2, 30, t.height());
	return svgElement("svg", [
		numAttr("width", t.width()*HSEP + H_PADDING),
		numAttr("height", t.height()*VSEP + STRIP_HEIGHT + V_PADDING),
		attr("xmlns", "http://www.w3.org/2000/svg"),
		attr("version", "1.1"),
		attr("font-family", "sans-serif"),
		numAttr("font-size", 15)], es);
}
