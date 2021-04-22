import type { List } from "./List";
import { elements, equalList } from "./List";
import { attr, line, lines, numAttr, svgElement, text } from "./SVG";

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

export interface ParseTree {
	height(): number;
	width(): number;
	getSentence(): string;

	// Draw the tree and the sentence it produces
	draw(out: Array<SVGElement>, // accumulating the drawing
		x: number, // x-coordinate of the middle of the tree
		y: number, // y-coordinate of the root of the tree
		levels: number // height of the root of the tree
		): number; // x-coordinate of the root of the tree
}

export class NonTerminalTree implements ParseTree {
	// derived values
	private readonly ht: number;
	private readonly wd: number;
	private readonly sentence: string;

	constructor(public readonly sym: string,
			public readonly children: List<ParseTree>) {
		let h: number = 1;
		let w: number = 0;
		for (const t of elements(children)) {
			h = Math.max(h, t.height());
			w = w + t.width();
		}
		this.ht = h+1;
		this.wd = Math.max(1, w);

		this.sentence = Array.from(elements(children),
			(t) => t.getSentence()).join("");
	}

	height(): number { return this.ht; }
	width(): number { return this.wd; }
	getSentence(): string { return this.sentence; }

	nonTerminal(): string { return this.sym; }

	draw(out: Array<SVGElement>, x: number, y: number, levels: number): number {
		// draw the child subtrees
		const ty: number = y + VSEP; // subtree root y-coordinate
		let trx: Array<number> = []; // subtree root x-coordinates
		let tx: number = x;
		for (const t of elements(this.children)) {
			trx.push(t.draw(out, tx, ty, levels-1));
			tx = tx + t.width()*HSEP;
		}

		// draw the root above the median of the subtree roots
		const n: number = trx.length;
		// x-coordinate of the root of the tree
		const rx: number = n === 0 ? x :
			// rx is median of subtree root x-coordinates
			(trx[Math.floor((n-1)/2)] + trx[Math.floor(n/2)])/2;
		out.push(text(rx, y, NT_SYMBOL_COLOUR, this.sym));

		// draw lines from the root to the children
		const y1: number = y+BOTTOM;
		const y2: number = ty-TOP;
		if (n === 0) {
			out.push(text(x, ty, NT_NULL_COLOUR, NT_NULL_SYMBOL));
			out.push(lines(NT_NULL_COLOUR, [line(x, y1, x, y2)]));
		} else {
			out.push(lines(NT_LINE_COLOUR,
				trx.map((cx) => line(rx, y1, cx, y2))));
		}
		return rx;
	}
}

export class TerminalTree implements ParseTree {
	constructor(public readonly sym: string) {}

	height(): number { return 1; }
	width(): number { return 1; }
	getSentence(): string { return this.sym; }

	draw(out: Array<SVGElement>, x: number, y: number, levels: number): number {
		// draw terminal at current position in the tree
		out.push(text(x, y, TERM_SYMBOL_COLOUR, this.sym));

		// draw terminal directly below that and outside the box
		const ly: number = y + levels*VSEP - 10;
		out.push(text(x, ly, TERM_SYMBOL_COLOUR, this.sym));

		// draw grey line connecting them
		out.push(lines(TERM_LINE_COLOUR,
			[line(x, y + BOTTOM, x, ly - TOP)]));
		return x;
	}
}

export function equalTree(t1: ParseTree, t2: ParseTree): boolean {
	if (t1 === t2)
		return true;
	if (t1 instanceof TerminalTree && t2 instanceof TerminalTree)
		return t1.sym === t2.sym;
	if (t1 instanceof NonTerminalTree && t2 instanceof NonTerminalTree)
		return t1.sym === t2.sym &&
			equalList(equalTree, t1.children, t2.children);
	return false;
}

// compare trees first by length of generated sentence, then generated
// text, then tree height
export function compareNTs(a: NonTerminalTree, b: NonTerminalTree): number {
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

export function drawTree(t: ParseTree): SVGElement {
	const box_width: number = t.width()*HSEP;
	const box_height: number = t.height()*VSEP;
	let es: Array<SVGElement> = [];
	// background of parse tree
	es.push(svgElement("rect", [
		numAttr("width", box_width),
		numAttr("height", box_height),
		attr("fill", "#fff7db")], []));
	// background of generated sentence
	es.push(svgElement("rect", [
		numAttr("y", box_height),
		numAttr("width", box_width),
		numAttr("height", STRIP_HEIGHT),
		attr("fill", "#f0e6bc")], []));
	// overlay with the tree and sentence
	t.draw(es, HSEP/2, 30, t.height());

	return svgElement("svg", [
		numAttr("width", box_width + H_PADDING),
		numAttr("height", box_height + STRIP_HEIGHT + V_PADDING),
		attr("xmlns", "http://www.w3.org/2000/svg"),
		attr("version", "1.1"),
		attr("font-family", "sans-serif"),
		numAttr("font-size", 15)], es);
}
