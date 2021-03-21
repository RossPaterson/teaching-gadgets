// Simple lists
type List<T> = Cons<T> | null;

class Cons<T> {
	constructor(public readonly head: T, public tail: List<T>) {}
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
	constructor(private list: List<T>) {}

	[Symbol.iterator](): Iterator<T> { return listIterator(this.list); }
}

function elements<T>(list: List<T>): Iterable<T> {
	return new ListElements<T>(list);
}
