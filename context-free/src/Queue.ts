namespace CFG {

// Simple queues

class QElement<T> {
	public next: QElement<T> | null;

	constructor(public readonly value: T) { this.next = null; }
}

export class Queue<T> {
	// invariant: if one of these is null, they both are
	private front: QElement<T> | null;
	private back: QElement<T> | null;

	constructor() { this.front = this.back = null; }

	// is the queue empty?
	isEmpty(): boolean { return this.front === null; }

	// add an element at the back of the queue
	add(v: T): void {
		if (this.back === null)
			this.back = this.front = new QElement<T>(v);
		else
			this.back = this.back.next = new QElement<T>(v);
	}

	// remove the front element from the queue
	// requires: ! isEmpty()
	remove(): T {
		const front = this.front;
		if (front !== null) {
			this.front = front.next;
			if (this.front === null)
				this.back = null;
			return front.value;
		}
		throw "empty queue";
	}
}

} // namespace CFG
