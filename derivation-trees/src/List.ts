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

function* listIterator<T>(list: List<T>): Iterator<T> {
	while (list !== null) {
		yield list.head;
		list = list.tail;
	}
}

class ListElements<T> implements Iterable<T> {
	private list: List<T>;

	constructor(list: List<T>) { this.list = list; }

	[Symbol.iterator](): Iterator<T> { return listIterator(this.list); }
}

function elements<T>(list: List<T>): Iterable<T> {
	return new ListElements<T>(list);
}
