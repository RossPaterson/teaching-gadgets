namespace Regex {

// algebraic datatype of regular expressions

export interface RegExpr {
	// eliminator: (F RegExpr => R) => R ~= F RegExpr
	cases<R>(alts: RegExprCases<RegExpr, R>): R;
}

// visitor for regexps = F A => R
export type RegExprCases<A, R> = {
	emptyExpr: () => R,
	singleExpr: (c: string) => R,
	orExpr: (e1: A, e2: A) => R,
	andExpr: (e1: A, e2: A) => R,
	starExpr: (e: A) => R
	}

// constructors: RegExprCases<RegExpr, RegExpr> = F RegExpr => RegExpr

export function emptyExpr(): RegExpr { return new EmptyExpr(); }
export function singleExpr(c: string): RegExpr { return new SingleExpr(c); }
export function orExpr(e1: RegExpr, e2: RegExpr): RegExpr {
	return new OrExpr(e1, e2);
}
export function andExpr(e1: RegExpr, e2: RegExpr): RegExpr {
	return new AndExpr(e1, e2);
}
export function starExpr(e: RegExpr): RegExpr { return new StarExpr(e); }

// primitive recursion: (F A => A) => RegExpr => A
export function foldRegExpr<A>(alts: RegExprCases<A, A>): (re: RegExpr) => A {
	return function fold(re: RegExpr): A {
		return re.cases({
			emptyExpr: () => alts.emptyExpr(),
			singleExpr: (c: string) => alts.singleExpr(c),
			orExpr: (e1: RegExpr, e2: RegExpr) =>
				alts.orExpr(fold(e1), fold(e2)),
			andExpr: (e1: RegExpr, e2: RegExpr) =>
				alts.andExpr(fold(e1), fold(e2)),
			starExpr: (e: RegExpr) => alts.starExpr(fold(e))
		});
	};
}

// empty string
class EmptyExpr implements RegExpr {
	constructor() {}

	cases<R>(alts: RegExprCases<RegExpr, R>) { return alts.emptyExpr(); }
}

// single character
class SingleExpr implements RegExpr {
	constructor(private readonly c: string) {}

	cases<R>(alts: RegExprCases<RegExpr, R>) {
		return alts.singleExpr(this.c);
	}
};

// e1 | e2
class OrExpr implements RegExpr {
	constructor(private readonly e1: RegExpr,
		private readonly e2: RegExpr) {}

	cases<R>(alts: RegExprCases<RegExpr, R>) {
		return alts.orExpr(this.e1, this.e2);
	}
}

// e1 e2
class AndExpr implements RegExpr {
	constructor(private readonly e1: RegExpr,
		private readonly e2: RegExpr) {}

	cases<R>(alts: RegExprCases<RegExpr, R>) {
		return alts.andExpr(this.e1, this.e2);
	}
}

// e*
class StarExpr implements RegExpr {
	constructor(private readonly e: RegExpr) {}

	cases<R>(alts: RegExprCases<RegExpr, R>) {
		return alts.starExpr(this.e);
	}
}

}
