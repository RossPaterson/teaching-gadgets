// Simple lists
export type List<T> = Cons<T> | null;

class Cons<T> {
	constructor(
		public readonly head: T,
		public readonly tail: List<T>) {}
}

export function cons<T>(x: T): (xs: List<T>) => List<T> {
	return (xs: List<T>) => new Cons<T>(x, xs);
}

// elementwise equality test for lists
export function equalList<T>(eq: (x: T, y: T) => boolean, xs: List<T>, ys: List<T>): boolean {
	while (xs !== null) {
		if (ys === null)
			return false;
		if (xs === ys)
			return true;
		if (! eq(xs.head, ys.head))
			return false;
		xs = xs.tail;
		ys = ys.tail;
	}
	return ys === null;
}

export function elements<T>(list: List<T>): Iterable<T> {
	return {
		[Symbol.iterator]: function*() {
			for (let p = list; p !== null; p = p.tail)
				yield p.head;
		}
	};
}
