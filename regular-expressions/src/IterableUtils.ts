// list-like functions on iterables

namespace IterableUtils {

export function map<A, B>(f: (a: A) => B): (xs: Iterable<A>) => Iterable<B> {
	return function (xs: Iterable<A>): Iterable<B> {
		return {
			[Symbol.iterator]: function*() {
				for (const x of xs)
					yield f(x);
			}
		};
	};
}

export function drop<A>(n: number, xs: Iterable<A>): Iterable<A> {
	return {
		[Symbol.iterator]: function*() {
			let px: Iterator<A> = xs[Symbol.iterator]();
			for (let i = 0; i < n; i++)
				if (px.next().done)
					return;
			for (let rx = px.next(); ! rx.done; rx = px.next())
				yield rx.value;
		}
	};
}

export function foldl<A, B>(f: (x: A, y: B) => B, z: B): (xs: Iterable<A>) => B {
	return function (xs: Iterable<A>): B {
		let y: B = z;
		for (const x of xs)
			y = f(x, y);
		return y;
	};
}

export function concat<A, B extends Iterable<A>>(xss: Iterable<B>): Iterable<A> {
	return {
		[Symbol.iterator]: function*() {
			for (const xs of xss)
				yield* xs;
		}
	};
}

export function longZipWith<A>(f: (x: A, y: A) => A):
		(xs: Iterable<A>, ys: Iterable<A>) => Iterable<A> {
	return function (xs: Iterable<A>, ys: Iterable<A>): Iterable<A> {
		return {
			[Symbol.iterator]: function*() {
				let px: Iterator<A> = xs[Symbol.iterator]();
				let py: Iterator<A> = ys[Symbol.iterator]();
				let rx: IteratorResult<A> = px.next();
				let ry: IteratorResult<A> = py.next();
				while (! rx.done || ! ry.done) {
					if (rx.done) {
						yield ry.value;
						ry = py.next();
					} else if (ry.done) {
						yield rx.value;
						rx = px.next();
					} else {
						yield f(rx.value, ry.value);
						rx = px.next();
						ry = py.next();
					}
				}
			}
		};
	};
}

// nth iterator consists of all f(xi, yj) such that i+j = n+1
export function diagonalsWith<A, B, C>(f: (x: A, y: B) => C):
		(xs: Iterable<A>, ys: Iterable<B>) => Iterable<Iterable<C>> {
	return function (xs: Iterable<A>, ys: Iterable<B>): Iterable<Iterable<C>> {
		return {
			[Symbol.iterator]: function*() {
				let px: Iterator<A> = xs[Symbol.iterator]();
				let py: Iterator<B> = ys[Symbol.iterator]();
				let rx: IteratorResult<A> = px.next();
				let ry: IteratorResult<B> = py.next();
				let x_arr: Array<A> = [];
				let y_arr: Array<B> = [];
				for (let n = 0; ; n++) {
					if (! rx.done)
						x_arr.push(rx.value);
					if (! ry.done)
						y_arr.push(ry.value);
					const lo = Math.max(0, n - y_arr.length + 1);
					const hi = Math.min(n, x_arr.length - 1);
					if (lo > hi)
						return;
					function* level(): Iterator<C> {
						for (let i = lo; i <= hi; i++)
							yield f(x_arr[i], y_arr[n-i]);
					}
					yield { [Symbol.iterator]: level };
					if (! rx.done)
						rx = px.next();
					if (! ry.done)
						ry = py.next();
				}
			}
		};
	};
}

} // namespace IterTools
