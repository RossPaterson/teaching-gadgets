namespace CFG {

// get the value of the named input element
export function getParameter(name: string): string {
	const element: HTMLElement | null = document.getElementById(name);
	if (element && element instanceof HTMLInputElement)
		return element.value;
	return "";
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
