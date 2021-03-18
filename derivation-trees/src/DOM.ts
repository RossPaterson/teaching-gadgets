
function getParameter(name: string): string {
	const element: HTMLInputElement = document.getElementById(name) as HTMLInputElement;
	if (element)
		return element.value;
	return "";
}

function removeChildren(element: HTMLElement): void {
	while (element.firstChild)
		element.removeChild(element.firstChild);
}

function bulletList(items: Array<string>): HTMLElement {
	let children: Array<HTMLElement> = [];
	for (let item of items)
		children.push(simpleElement("li", item));
	return compoundElement("ul", children);
}

function simpleElement(name: string, content: string): HTMLElement {
	const element: HTMLElement = document.createElement(name);
	element.textContent = content;
	return element;
}

function compoundElement(name: string, children: Array<HTMLElement>): HTMLElement {
	const element: HTMLElement = document.createElement(name);
	for (let child of children)
		element.appendChild(child);
	return element;
}
