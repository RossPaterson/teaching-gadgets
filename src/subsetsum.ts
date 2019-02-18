/// <reference path="applet.ts" />

const subsetParams = {
	maxValue: 99,
	inColor: "#000",
	outColor: "#C8C8C8",
	goodColor: "#00C800",
	badColor: "#C80000"
};

class Entry {
	readonly value: number;
	selected: boolean;
	inSolution: boolean;

	constructor(value: number, inSolution: boolean) {
		this.value = value;
		this.selected = false;
		this.inSolution = inSolution;
	}
}

class SubsetSumApplet extends Applet {
	private capacity: number;
	private array: Array<Entry>;

	constructor(name: string, numValues: number) {
		super(name);
		this.setSize(numValues);
		this.listenMousedown();
	}

	setSize(n: number): void {
		this.capacity = n*40;
		this.array = newProblem(n, this.capacity);
		this.redraw();
	}

	reset(): void {
		this.setSize(this.array.length);
	}

	sort(): void {
		this.array.sort(function(a, b){return a.value - b.value;});
		this.redraw();
	}

	solve(): void {
		for (let elem of this.array)
			elem.selected = elem.inSolution;
		this.redraw();
	}

	private redraw(): void {
		this.background();
		drawSelection(this.canvas, this.array, this.capacity);
	}

	protected mousedown(x: number, y: number): void {
		const width: number = this.canvas.offsetWidth;
		const i: number = Math.floor((x * (this.array.length+1)) / width);
		if (i < this.array.length) {
			this.array[i].selected = ! this.array[i].selected;
			this.redraw();
		}
	}
}

function newProblem(size: number, capacity: number): Array<Entry> {
	let arr: Array<Entry> = [];
	let left: number = capacity;
	for (let i: number = 0; i < size; i++) {
		let value: number;
		if (left > 0 && left <= subsetParams.maxValue) {
			value = left;
		} else {
			const minValue: number = left > 0 ?
				Math.ceil(capacity / (size - i - 2)) : 11
			value = minValue + Math.floor(Math.random()*(subsetParams.maxValue-minValue+1));
		}
		if (left > 0) {
			arr.push(new Entry(value, true));
			left -= value;
		} else {
			arr.push(new Entry(value, false));
		}
	}
	shuffle(arr);
	return arr;
}

function drawSelection(elem: HTMLCanvasElement, arr: Array<Entry>, capacity: number): void {
        const ctx: CanvasRenderingContext2D = elem.getContext("2d");
        const width: number = elem.offsetWidth;
        const height: number = elem.offsetHeight;

	ctx.font = "15px Arial";
	ctx.fillStyle = "black";
	ctx.textAlign = "center";
	ctx.fillText("Target: " + capacity, width/2, 20);

	const ypos: number = height*2/3;
	const ncells: number = arr.length + 1;
	const len: number = arr.length;
	let total: number = 0;
	for (let i: number = 0; i < len; i++) {
		if (arr[i].selected) {
			ctx.fillStyle = subsetParams.inColor;
			total += arr[i].value;
		} else {
			ctx.fillStyle = subsetParams.outColor;
		}
		ctx.fillText(String(arr[i].value), (2*i + 1)*width / (2*ncells), ypos);
		ctx.fillStyle = "black";
		ctx.fillText(i+1 < arr.length ? "+" : "=", (i+1)*width/ncells, ypos);
	}
	ctx.fillStyle = total <= capacity ? subsetParams.goodColor : subsetParams.badColor;
	ctx.fillText(String(total), (2*arr.length + 1)*width / (2*ncells), ypos);
}
