// Simple lists
type List<T> = Cons<T> | null;

class Cons<T> {
	public head: T;
	public tail: List<T>;

	constructor(x: T, xs: List<T>) {
		this.head = x;
		this.tail = xs;
	}
}

function cons<T>(x: T) {
	return function (xs: List<T>) { return new Cons<T>(x, xs); };
}

function arrayOf<T>(list: List<T>): Array<T> {
	let a: Array<T> = [];
	while (list !== null) {
		a.push(list.head);
		list = list.tail;
	}
	return a;
}
