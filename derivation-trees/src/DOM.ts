// get the value of the named input element
function getParameter(name: string): string {
	const element: HTMLInputElement = document.getElementById(name) as HTMLInputElement;
	if (element)
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
	let children: Array<HTMLElement> = [];
	for (let item of items)
		children.push(simpleElement("li", item));
	return compoundElement("ul", children);
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
	for (let child of children)
		element.appendChild(child);
	return element;
}
