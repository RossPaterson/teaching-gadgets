// get the value of the named input element
function getParameter(name: string): string {
	const element: HTMLElement | null = document.getElementById(name);
	if (element && element instanceof HTMLInputElement)
		return element.value;
	return "";
}

// remove all the children from an element
function removeChildren(element: HTMLElement): void {
	while (element.lastChild)
		element.removeChild(element.lastChild);
}

// form an HTML unordered list from a list of strings
function bulletList(items: Array<string>): HTMLElement {
	return compoundElement("ul",
		items.map((item: string) => simpleElement("li", item)));
}

// create an HTML element with string content
function simpleElement(name: string, content: string): HTMLElement {
	const element: HTMLElement = document.createElement(name);
	element.textContent = content;
	return element;
}

// create an HTML element with a list of elements as content
function compoundElement(name: string, children: Array<HTMLElement>): HTMLElement {
	const element: HTMLElement = document.createElement(name);
	for (const child of children)
		element.appendChild(child);
	return element;
}
