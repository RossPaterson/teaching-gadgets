// Simple lists
type List<T> = Cons<T> | null;

class Cons<T> {
	constructor(public readonly head: T, public readonly tail: List<T>) {}
}

function cons<T>(x: T) {
	return function (xs: List<T>) { return new Cons<T>(x, xs); };
}

interface Equality<T> { equals(o: T): boolean; }

// elementwise equality test for lists
function equalList<T extends Equality<T>>(xs: List<T>, ys: List<T>): boolean {
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

function elements<T>(list: List<T>): Iterable<T> {
	return {
		[Symbol.iterator]: function*() {
			for (let p = list; p !== null; p = p.tail)
				yield p.head;
		}
	};
}
