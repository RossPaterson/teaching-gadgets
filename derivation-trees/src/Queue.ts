/// <reference path="List.ts" />

// simple queues
class Queue<T> {
	private front: List<T>;
	private back: List<T>;

	constructor() { this.front = this.back = null; }

	// is the queue empty?
	isEmpty(): boolean { return this.front === null; }

	// add an element at the pack of the queue
	add(v: T): void {
		if (this.back === null)
			this.back = this.front = new Cons<T>(v, null);
		else
			this.back = this.back.tail = new Cons<T>(v, null);
	}

	// remove the front element of the queue
	// requires: ! isEmpty()
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
