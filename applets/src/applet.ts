const ColourScheme = {
	done: "#ddd",
	highlight: "#ff0",
	plain: "white"
};

// an applet drawing in an HTML canvas
abstract class Applet {
	private readonly bgColour: string;
	protected readonly canvas: HTMLCanvasElement;

	constructor(name: string, bgColour: string = "white") {
		this.canvas = document.getElementById(name) as HTMLCanvasElement;
		this.bgColour = bgColour;
	}

	protected hideshow(): void {
		hideshow(this.canvas);
	}

	protected background(): void {
		const ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		const width: number = this.canvas.offsetWidth;
		const height: number = this.canvas.offsetHeight;
		ctx.fillStyle = this.bgColour;
		ctx.fillRect(0, 0, width, height);
	}

	// Make the applet listen for mousedown events.
	protected listenMousedown(): void {
		const self: Applet = this;
		this.canvas.addEventListener("mousedown", function(e) {
			const x: number = getMouseX(e) - self.canvas.offsetLeft;
			const y: number = getMouseY(e) - self.canvas.offsetTop;
			self.mousedown(x, y);
		});
	}

	// x and y are coordinates within this.canvas.
	// This should be overridden by children that react to mouse clicks.
	protected mousedown(x: number, y: number): void {}
}

// Internet Explorer compatibility

if (! Math.sign) {
	Math.sign = function(x) { return x < 0 ? -1 : x > 0 ? 1 : 0; };
}

if (! Number.isInteger) {
	Number.isInteger = function(x) {
		return typeof x === 'number' && isFinite(x) && Math.floor(x) === x;
	};
}

// DOM utilities

function hideshow(obj: HTMLElement): void {
	obj.style.display = obj.style.display === 'none' ? 'block' : 'none';
}

// get the checked element of a group of radio buttons
function getRadioButton(name: string): HTMLInputElement {
	const radios = document.getElementsByName(name) as NodeListOf<HTMLInputElement>;
	const length: number = radios.length;
	for (let i: number = 0; i < length; i++)
		if (radios[i].checked)
			return radios[i];
	return radios[0];
}

// mouse utilities

function getMouseX(event: MouseEvent): number {
	if (event.x !== undefined)
		return event.x;
	// Firefox version
	return event.clientX + document.body.scrollLeft +
		document.documentElement.scrollLeft;
}

function getMouseY(event: MouseEvent): number {
	if (event.y !== undefined)
		return event.y;
	// Firefox version
	return event.clientY + document.body.scrollTop +
		document.documentElement.scrollTop;
}

namespace ArrayUtilities {
	// Fisher-Yates shuffle
	export function shuffle<T>(arr: Array<T>): void {
		const n: number = arr.length;
		for (let i: number = 0; i < n; i++) {
			const j: number = i + Math.floor(Math.random()*(n - i));
			if (j !== i)
				swap(arr, i, j);
		}
	}

	// Swap entries at i and j in arr.
	export function swap<T>(arr: Array<T>, i: number, j: number): void {
		const tmp: T = arr[i];
		arr[i] = arr[j];
		arr[j] = tmp;
	}

	// Move an entry from one position in an array to another,
	// bumping intervening entries along to make room.
	export function move<T>(arr: Array<T>, from: number, to: number): void {
		const step: number = Math.sign(to - from);
		if (step !== 0) {
			const tmp = arr[from];
			for (let i = from; i !== to; i = i + step)
				arr[i] = arr[i + step];
			arr[to] = tmp;
		}
	}

	// Partition the part of the array from lo to hi based on a pivot
	// value at pos, returning the final position of the pivot.
	export function partition<T>(arr: Array<T>, pos: number,
			lo: number, hi: number): number {
		const pivot: T = arr[pos];
		// move the selected pivot to the start
		swap(arr, lo, pos);
		// partition the rest of the range
		let i: number = lo+1;
		let j: number = hi;
		while (i <= j) {
			while (i <= j && arr[i] <= pivot)
				i++;
			while (j >= i && arr[j] >= pivot)
				j--;
			if (i < j) {
				swap(arr, i, j);
				i++;
				j--;
			}
		}
		// move the pivot to the middle
		swap(arr, lo, j);
		return j;
	}
}

// backward compatibility
import swap = ArrayUtilities.swap;
import move = ArrayUtilities.move;
