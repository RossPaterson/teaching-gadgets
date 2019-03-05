/// <reference path="applet.ts" />

namespace BarArrayAppletImpl {

// Marking some entries for highlighting

// Selected entry for an operation
class ArraySelection {
	private index: number;

	constructor() { this.index = -1; } 

	clear(): void { this.index = -1; }
	isSet(): boolean { return this.index >= 0; }
	contains(i: number): boolean { return i == this.index; }
}

// Initial portion already processed
class ArrayDone {
	private count: number;

	constructor() { this.count = 0; }

	clear(): void { this.count = 0; }
	contains(i: number): boolean { return i < this.count; }
}

// Presentation of an array as a collection of bars
export class BarArrayApplet extends Applet {
	private readonly selection: ArraySelection;
	private readonly done: ArrayDone;
	private readonly array: Array<number>;

	constructor(name: string, size: number) {
		super(name);
		this.selection = new ArraySelection();
		this.done = new ArrayDone();
		this.array = newArray(size);
		this.reset();
		this.listenMousedown();
	}

	changed(): void {
		this.redraw();
	}

	redraw(): void {
		this.background();
		drawArray(this.canvas, this.array, this.selection, this.done);
	}

	reset(): void {
		ArrayUtilities.shuffle(this.array);
		this.selection.clear();
		this.done.clear();
		this.changed();
	}

	clickElement(pos: number): void {}

	protected mousedown(x: number, y: number): void {
		const pos = currentPos(this.canvas, this.array, x);
		this.clickElement(pos);
		this.changed();
	}
}

function currentPos(elem: HTMLCanvasElement, arr: Array<number>, x: number): number {
	const numBars: number = arr.length;
	const margin: number = getMargin(elem);
	const drawWidth: number = elem.offsetWidth - 2*margin;
	let index: number = Math.floor((x - margin) / drawWidth * numBars);
	if (index < 0) {
		index = 0;
	} else if (index >= numBars) {
		index = numBars - 1;
	}
	return index;
}

function drawArray(elem: HTMLCanvasElement, arr: Array<number>, sel: ArraySelection, done: ArrayDone): void {
	const ctx = elem.getContext("2d") as CanvasRenderingContext2D;
	const width: number = elem.offsetWidth;
	const height: number = elem.offsetHeight;
	const margin: number = getMargin(elem);

	const maxHeight: number = height - 2*margin;
	const drawWidth: number = width - 2*margin;
	const step: number = maxHeight / arr.length;
	const base: number = height - margin;
	const numBars: number = arr.length;
	const barWidth: number = Math.round(drawWidth / numBars * 0.6);
	for (let i: number = 0; i < numBars; i++) {
		const xpos: number = margin + drawWidth*(i + 0.5)/numBars - barWidth/2;
		const barHeight: number = arr[i]*step;
		const ypos: number = base - barHeight;
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 1;
		if (sel.contains(i)) {
			ctx.fillStyle = ColourScheme.highlight;
		} else if (done.contains(i)) {
			ctx.fillStyle = ColourScheme.done;
		} else {
			ctx.fillStyle = "#7af";
		}
		ctx.fillRect(xpos, ypos, barWidth, barHeight);
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 0.6;
		ctx.strokeRect(xpos, ypos, barWidth, barHeight);
	}
}

function getMargin(elem: HTMLCanvasElement): number {
	return Math.min(elem.offsetWidth, elem.offsetHeight) / 8;
}

// array containing the numbers 1..n
function newArray(n: number): Array<number> {
	let arr: Array<number> = [];
	for (let i: number = 1; i <= n; i++) {
		arr.push(i);
	}
	return arr;
}

// length of ordered prefix
export function initOrdered(arr: Array<number>): number {
	let i: number = 1;
	while (i < arr.length && arr[i-1] <= arr[i]) {
		i++;
	}
	return i;
}

// length of prefix of smallest elements
export function initLeast(arr: Array<number>): number {
	let min: number = initOrdered(arr);
	const len: number = arr.length;
	for (let i: number = min; i < len; i++) {
		while (min > 0 && arr[min-1] > arr[i]) {
			min--;
		}
	}
	return min;
}

} // namespace BarArrayAppletImpl

import BarArrayApplet = BarArrayAppletImpl.BarArrayApplet
import initOrdered = BarArrayAppletImpl.initOrdered
import initLeast = BarArrayAppletImpl.initLeast
