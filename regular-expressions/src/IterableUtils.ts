// list-like functions on iterables

// The iterables returned by these functions are reusable if the iterable
// arguments are.

function iterable<A>(maker: () => Iterator<A>): Iterable<A> {
	return { [Symbol.iterator]: maker };
}

function iterator<A>(xs: Iterable<A>): Iterator<A> {
	return xs[Symbol.iterator]();
}

export function map<A, B>(f: (a: A) => B): (xs: Iterable<A>) => Iterable<B> {
	return function (xs: Iterable<A>): Iterable<B> {
		return iterable(function*() {
			for (const x of xs)
				yield f(x);
		});
	};
}

export function drop<A>(n: number, xs: Iterable<A>): Iterable<A> {
	return iterable(function() {
		let px: Iterator<A> = iterator(xs);
		for (let i = 0; i < n; i++)
			if (px.next().done)
				break;
		return px;
	});
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
	return iterable(function*() {
		for (const xs of xss)
			yield* xs;
	});
}

export function longZipWith<A>(f: (x: A, y: A) => A):
		(xs: Iterable<A>, ys: Iterable<A>) => Iterable<A> {
	return function (xs: Iterable<A>, ys: Iterable<A>): Iterable<A> {
		return iterable(function*() {
			let px: Iterator<A> = iterator(xs);
			let py: Iterator<A> = iterator(ys);
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
		});
	};
}

// nth iterable consists of all f(xi, yj) such that i+j = n+1
export function diagonalsWith<A, B, C>(f: (x: A, y: B) => C):
		(xs: Iterable<A>, ys: Iterable<B>) => Iterable<Iterable<C>> {
	return function (xs: Iterable<A>, ys: Iterable<B>): Iterable<Iterable<C>> {
		return iterable(function*() {
			let px: Iterator<A> = iterator(xs);
			let py: Iterator<B> = iterator(ys);
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
				yield map((i: number) => f(x_arr[i], y_arr[n-i]))
					(range(lo, hi));
				if (! rx.done)
					rx = px.next();
				if (! ry.done)
					ry = py.next();
			}
		});
	};
}

// merge two ordered sequences without duplicates
export function mergeWith<A>(compare: (x: A, y: A) => number,
		xs: Iterable<A>, ys: Iterable<A>): Iterable<A> {
	return iterable(function*() {
		let px: Iterator<A> = iterator(xs);
		let py: Iterator<A> = iterator(ys);
		let rx: IteratorResult<A> = px.next();
		let ry: IteratorResult<A> = py.next();
		while (! rx.done && ! ry.done) {
			const comp = compare(rx.value, ry.value);
			if (comp === 0) {
				yield rx.value;
				rx = px.next();
				ry = py.next();
			} else if (comp < 0) {
				yield rx.value;
				rx = px.next();
			} else {
				yield ry.value;
				ry = py.next();
			}
		}
		if (rx.done)
			while (! ry.done) {
				yield ry.value;
				ry = py.next();
			}
		else
			while (! rx.done) {
				yield rx.value;
				rx = px.next();
			}
	});
}

export function cons<A>(x: A, xs: Iterable<A>): Iterable<A> {
	return iterable(function*() {
		yield x;
		yield* xs;
	});
}

export function range(start: number, finish: number, step: number = 1):
		Iterable<number> {
	return iterable(function*() {
		if (step > 0)
			for (let i = start; i <= finish; i += step)
				yield i;
		else if (step < 0)
			for (let i = start; i >= finish; i += step)
				yield i;
	});
}

// Link in a list of values generated by an iterator
// value and next are present if and only if linkType == Cons
type Link<A> = { linkType: LinkType, value?: A, next?: Link<A> }

// Type of link
enum LinkType {
	Hole, // end of the values retrieved so far
	End, // end of the iterator has been reached
	Cons // a retrieved value and a link to more values
	};

// An iterator that takes values from the cursor if possible.  If not,
// it takes a value from px, adding it at the cursor for the benefit of
// other instances sharing this list and iterator.
function* sharingIterator<A>(cursor: Link<A>, xp: Iterator<A>): Iterator<A> {
	for (;;) {
		if (cursor.linkType === LinkType.Hole) {
			const rx: IteratorResult<A> = xp.next();
			if (rx.done)
				cursor.linkType = LinkType.End;
			else {
				cursor.linkType = LinkType.Cons;
				cursor.value = rx.value;
				cursor.next = { linkType: LinkType.Hole };
			}
		}
		if (cursor.linkType === LinkType.End)
			return;
		const result: A = cursor.value!;
		cursor = cursor.next!;
		yield result;
	}
}

// An iterable whose iterators each produce the sequence of values of
// the argument iterator, which is consumed on demand.
export function share<A>(xp: Iterator<A>): Iterable<A> {
	// list of values retrieved from xp, shared between the generated
	// iterators
	const values: Link<A> = { linkType: LinkType.Hole };
	return iterable(() => sharingIterator(values, xp));
}

// An iterable whose iterators each produce the sequence of values of the
// a single iterator from xs.
export function once<A>(xs: Iterable<A>): Iterable<A> {
	return share(iterator(xs));
}

// Construct a recursively defined iterable that returns the result of
// f applied to the whole iterable.  This is done by feeding back the
// outputs of the generated iterator to the function generating it,
// so it won't work if f demands values too soon.
export function fixpoint<A>(f: (xs: Iterable<A>) => Iterable<A>): Iterable<A> {
	const xs: Iterable<A> = once(iterable(function*() { yield* f(xs); }));
	return xs;
}
