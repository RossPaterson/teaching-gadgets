// simulating an algebraic data type
// data Result<V, E> = success(v: V) | failure(e: E)

// either a successful result value or an error
export interface Result<V, E> {
	cases<R>(alts: ResultCases<V, E, R>): R;
}

export type ResultCases<V, E, R> = {
	success: (v: V) => R,
	failure: (e: E) => R
};

// constructors

export function success<V, E>(v: V): Result<V, E> { return new Success(v); }
export function failure<V, E>(e: E): Result<V, E> { return new Failure(e); }

class Success<V, E> implements Result<V, E> {
	constructor(private readonly v: V) {}

	cases<R>(alts: ResultCases<V, E, R>) {
		return alts.success(this.v);
	}
}

class Failure<V, E> implements Result<V, E> {
	constructor(private readonly e: E) {}

	cases<R>(alts: ResultCases<V, E, R>) {
		return alts.failure(this.e);
	}
}
