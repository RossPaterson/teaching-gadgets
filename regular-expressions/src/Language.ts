import * as Iter from "./IterableUtils";

// Representation of a (possibly infinite) regular language.
// The nth value in the iterable is a set of strings of length n,
// in alphabetical order without duplicates.
export type Language = Iterable<StringSet>;

// an array of strings of the same length, in order and without duplicates
type StringSet = Array<string>;

// all strings, in order of length and then contents
export let strings: (l: Language) => Iterable<string> = Iter.concat;

// Language operators

export let emptyString: Language = [[""]];

export function singleLetter(c: string): Language { return [[], [c]]; }

export let unionLangs: (l1: Language, l2: Language) => Language =
	Iter.longZipWith(union);

export function catLangs(l1: Language, l2: Language): Language {
	return Iter.map(unions)(Iter.diagonalsWith(append)(l1, l2));
}

export function starLang(l: Language): Language {
	return Iter.fixpoint((l_star: Language) =>
		Iter.cons([""], catLangs(Iter.drop(1, l), l_star)));
}

// Operations on string sets, represented as ordered arrays of strings
// without duplicates

// concatenation of all combinations
function append(xs: StringSet, ys: StringSet): StringSet {
	return unions(Iter.map((x) => ys.map((y) => x + y))(xs));
}

// union of a collection of sets of strings
const unions: (ss: Iterable<StringSet>) => StringSet =
	Iter.foldl(union, []);

// union of two sets of strings
function union(xs: StringSet, ys: StringSet): StringSet {
	return Array.from(Iter.mergeWith(compareString)(xs, ys));
}

function compareString(x: string, y: string): number {
	return x < y ? -1 : x === y ? 0 : 1;
}
