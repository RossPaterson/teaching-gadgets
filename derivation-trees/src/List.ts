// Simple immutable lists
type List<T> = Cons<T> | null;

class Cons<T> {
	public head: T;
	public tail: List<T>;

	constructor(head: T, tail: List<T>) {
		this.head = head;
		this.tail = tail;
	}
}

function arrayOf<T>(list: List<T>): Array<T> {
	let a: Array<T> = [];
	while (list !== null) {
		a.push(list.head);
		list = list.tail;
	}
	return a;
}
