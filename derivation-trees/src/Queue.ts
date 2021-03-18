/// <reference path="List.ts" />

// simple queues
class Queue<T> {
	private front: List<T>;
	private back: List<T>;

	constructor() {
		this.front = null;
		this.back = null;
	}

	isEmpty(): boolean { return this.front === null; }

	add(v: T): void {
		if (this.back === null)
			this.back = this.front = new Cons<T>(v, null);
		else
			this.back = this.back.tail = new Cons<T>(v, null);
	}

	remove(): T {
		let head: List<T> = this.front;
		if (head !== null) {
			this.front = head.tail;
			if (this.front === null)
				this.back = null;
			return head.head;
		}
		throw "empty queue";
	}
}
