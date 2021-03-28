namespace CFG {

// find an element by ID
export function findElement(name: string): HTMLElement {
	const element: HTMLElement | null = document.getElementById(name);
	if (element === null)
		throw `No element "${name}"`;
	return element;
}

// find an input element by ID
export function findInputElement(name: string): HTMLInputElement {
	const element: HTMLElement = findElement(name);
	if (! (element instanceof HTMLInputElement))
		throw `"${name}" is not an input element`;
	return element;
}

// remove all the children from an element
export function removeChildren(element: HTMLElement): void {
	while (element.lastChild)
		element.removeChild(element.lastChild);
}

// form an HTML unordered list from a list of strings
export function bulletList(items: Array<string>): HTMLElement {
	return compoundElement("ul",
		items.map((item: string) => simpleElement("li", item)));
}

// create an HTML element with string content
export function simpleElement(name: string, content: string): HTMLElement {
	const element: HTMLElement = document.createElement(name);
	element.textContent = content;
	return element;
}

// create an HTML element with a list of elements as content
export function compoundElement(name: string, children: Array<HTMLElement>): HTMLElement {
	const element: HTMLElement = document.createElement(name);
	for (const child of children)
		element.appendChild(child);
	return element;
}

}
