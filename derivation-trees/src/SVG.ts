// Scalable Vector Graphics

type Attribute = { name: string, value: string };

function attr(n: string, v: string): Attribute {
	return { name: n, value: v };
}

function numAttr(n: string, v: number): Attribute {
	return { name: n, value: String(v) };
}

function svgElement(name: string, attrs: Array<Attribute>, children: Array<SVGElement>): SVGElement {
	const e: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", name);
	for (let attr of attrs)
		e.setAttribute(attr.name, attr.value);
	for (let child of children)
		e.appendChild(child);
	return e;
}

function lines(colour: string, children: Array<SVGElement>): SVGElement {
	return svgElement("g", [
		attr("stroke", colour),
		attr("stroke-width", "1"),
		attr("stroke-linecap", "round")], children);
}

function line(x1: number, y1: number, x2: number, y2: number): SVGElement {
	return svgElement("line", [
		numAttr("x1", x1),
		numAttr("y1", y1),
		numAttr("x2", x2),
		numAttr("y2", y2)], []);
}

function text(x: number, y: number, colour: string, s: string): SVGElement {
	const element = svgElement("text", [
		numAttr("x", x),
		numAttr("y", y),
		attr("text-anchor", "middle"),
		attr("fill", colour)], []);
	element.textContent = s;
	return element;
}
