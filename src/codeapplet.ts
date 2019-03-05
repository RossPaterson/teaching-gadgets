/// <reference path="applet.ts" />

// Bugs:
// - function calls happen even if the subexpression containing them would
//   not be executed (inside the second argument of AND or OR)
//
// Interface weaknesses:
// - return values are only shown at the top level
// - progress within statements with multiple function calls is unclear
// - shared arrays are not marked very well (but it is useful to show the
//   different progress of different activations through the same array)

type Value = any;
interface Dictionary<T> { [varName: string]: T; }

// built-in procedures and functions
let builtIn: Dictionary<(...rest: Value[]) => Value> = {};
builtIn.Swap = ArrayUtilities.swap;

namespace CodeAppletImpl {

type Maybe<T> = T | null

const codeParams = {
	timeStep: 1000, // in milliseconds
	// rendering parameters
	lineSpacing: 20,
	baseLine: 16,
	indent: 30,
	cellWidth: 40,
	cellHeight: 30,
	leftMargin: 60,
	rightMargin: 30,
	headerHeight: 30,
	headerColour: "#a0522d",
	codeColour: "#ffeecc",
	currentColour: "#ffcc77",
	stateColour: "#eeccaa"
};

function emptyDictionary<T>(): Dictionary<T> { return {}; }

type Predicate = (x: Value) => boolean;

// built-in predicates
const predicates: Dictionary<Predicate> = {
	even: function (n: number): boolean {
		return Number.isInteger(n/2);
	},
	odd: function (n: number): boolean {
		return ! Number.isInteger(n/2);
	},
	composite: function (n: number): boolean {
		if (Number.isInteger(n/2))
			return true;
		for (let f: number = 3; f*f <= n; f += 2)
			if (Number.isInteger(n/f))
				return true;
		return false;
	},
	prime: function (n: number): boolean {
		return ! predicates.composite(n);
	}
};

interface Parameter {
	readonly paramName: string,
	readonly sizeName?: string	// size parameter (for arrays only)
}

// parameters of current procedure, used by code parser
let currentParams: Array<Parameter>;

// function calls on the current source line, in leftmost innermost order
let callsOnCurrentLine: Array<FunctionCall>;

type Variables = Dictionary<Value>;

interface State {
	localVars: Variables;
	returnValues: Array<Value>;
	// state may have grown since last setDimensions()
	grown: boolean;
}

type Parser<T> = (sc: Scanner) => T;

// Scanner for recursive descent parser
class Scanner {
	private str: string; // rest of string to scan
	private indents: Array<number>;
	private pendingCloses: number; // pending close braces

	token: string; // lookahead token
	currLine: string;

	constructor(str: string) {
		this.str = str;
		this.indents = [];
		this.pendingCloses = 0;
		this.advance();
	}

	current(): string { return this.token; }

	peek(): string { return this.str; }

	private getCurrLine(): string {
		return (this.str.match(/.*/) as RegExpMatchArray)[0];
	}

	private skipSpace(): number {
		const match = this.str.match(/^ */) as RegExpMatchArray;
		const len = match[0].length;
		this.str = this.str.substr(len);
		return len;
	}

	advance(): void {
		if (this.pendingCloses > 0) {
			this.pendingCloses--;
			this.token = '}';
			return;
		}
		let spaceLength = this.skipSpace();
		if (this.indents.length == 0) {
			this.currLine = this.getCurrLine();
			this.indents.push(spaceLength);
		}
		if (this.str.charAt(0) == '\r')
			this.str = this.str.substr(1);
		if (this.str.charAt(0) == '\n') {
			// layout processing
			do {
				this.str = this.str.substr(1);
				spaceLength = this.skipSpace();
				if (this.str.charAt(0) == '\r')
					this.str = this.str.substr(1);
			} while (this.str.charAt(0) == '\n');
			this.currLine = this.getCurrLine();
			if (this.str.length > 0) {
				const currentIndent = this.indents[this.indents.length-1];
				if (spaceLength > currentIndent) {
					this.indents.push(spaceLength);
					this.token = '{';
				} else if (spaceLength == currentIndent) {
					this.token = ';';
				} else {
					while (this.indents.length > 1 && spaceLength < this.indents[this.indents.length-1]) {
						this.indents.pop();
						this.pendingCloses++;
					}
					if (spaceLength != this.indents[this.indents.length-1])
						this.fail("inconsistent indentation");
					this.pendingCloses--;
					this.token = '}';
				}
				return;
			}
		}
		if (this.str.length == 0) {
			// end of input
			while (this.indents.length > 1) {
				this.indents.pop();
				this.pendingCloses++;
			}
			if (this.pendingCloses > 0) {
				this.pendingCloses--;
				this.token = '}';
			} else
				this.token = '';
			return;
		}
		const token = this.str.match(/^([a-zA-Z]\w*|\d+|.)/)[0];
		this.str = this.str.substr(token.length);
		this.token = token;
		// console.log(`token = '${this.token}'`);
	}

	fail(msg: string): never {
		throw `${msg}: ${this.currLine}`;
	}

	match(t: string): void {
		if (this.token != t)
			this.fail(`'${this.token}' found when expecting '${t}'`);
		this.advance();
	}

	getRestOfLine(): string {
		return this.getCurrLine().trim();
	}

	just<T>(nonterm: Parser<T>): T {
		const e: T = nonterm(this);
		if (this.token != '')
			this.fail(`'${this.token}' found when expecting end of string`);
		return e;
	}

	test(): void {
		let all = this.token;
		this.advance();
		while (this.token != '') {
			all = all + ' ' + this.token;
			this.advance();
		}
		console.log(all);
	}
}

// Recursive descent parser for header

function algHeader(sc: Scanner): Array<Parameter> {
	sc.advance();
	sc.match('(');
	let params: Array<Parameter> = [];
	params.push(parameter(sc));
	while (sc.token == ',') {
		sc.advance();
		params.push(parameter(sc));
	}
	sc.match(')');
	return params;
}

// parameter = name | name[0..size-1] | name[size]
function parameter(sc: Scanner): Parameter {
	const name: string = sc.token;
	sc.advance();
	if (sc.token != '[')
		return {paramName: name};
	sc.advance();
	let size: string;
	if (sc.current() == '0') { // 0..size-1
		sc.advance();
		sc.match('.');
		sc.match('.');
		size = sc.token;
		sc.advance();
		sc.match('-');
		sc.match('1');
	} else { // size
		size = sc.token;
		sc.advance();
	}
	sc.match(']');
	return {paramName: name, sizeName: size};
}

// Recursive descent parser for pseudocode

//	block	= '{' stmtlist '}'

function block(sc: Scanner): Block {
	sc.match('{');
	const stmts = stmtlist(sc);
	sc.match('}');
	return stmts;
}

function stmtlist(sc: Scanner): Block {
	let stmts: Array<Statement> = [];
	stmts.push(stmt(sc));
	while (sc.token != '}' && sc.token != '') {
		if (sc.token == ';')
			sc.advance();
		stmts.push(stmt(sc));
	}
	return new Block(stmts);
}

//	stmt	= WHILE expr block
//		| IF expr block (ELSE (block | stmt))?
//		| RETURN expr
//		| ident '(' arglist ')'
//		| lhs '←' expr
//
//	lhs	= ident
//		| ident '[' expr ']'

function stmt(sc: Scanner): Statement {
	callsOnCurrentLine = [];
	const v: string = sc.token;
	if (v == 'WHILE') {
		const line: string = sc.getRestOfLine();
		sc.advance();
		const cond: Expression = expr(sc);
		const fcalls: Array<FunctionCall> = callsOnCurrentLine;
		const body: Block = block(sc);
		return new WhileStmt(fcalls, line, cond, body);
	}
	if (v == 'IF') {
		const line: string = sc.getRestOfLine();
		sc.advance();
		const cond: Expression = expr(sc);
		const fcalls: Array<FunctionCall> = callsOnCurrentLine;
		const thenPart: Block = block(sc);
		if (sc.token != 'ELSE')
			return new IfStmt(fcalls, line, cond, thenPart);
		sc.advance();
		const else_block: boolean = sc.current() == '{';
		const elsePart: Block =
			else_block ? block(sc) : new Block([stmt(sc)]);
		return new IfElseStmt(fcalls, line, cond, thenPart, elsePart, else_block);
	}
	if (v == 'RETURN') {
		const line: string = sc.getRestOfLine();
		sc.advance();
		const e: Expression = expr(sc);
		return new ReturnStmt(callsOnCurrentLine, line, e);
	}
	const line: string = sc.currLine;
	sc.advance();
	if (sc.token == '(') {
		const args: Array<Expression> = arglist(sc);
		return new CallStmt(callsOnCurrentLine, line, v, args);
	}
	let lhs: Assignment;
	if (sc.token == '[') {
		sc.advance();
		const i = expr(sc);
		sc.match(']');
		lhs = assignArrayElement(v, i);
	} else
		lhs = assignVariable(v);
	sc.match('←');
	const rhs: Expression = expr(sc);
	return new AssignStmt(callsOnCurrentLine, line, v, lhs, rhs);
}

//	expr	= disjunct ('OR' disjunct)*

function expr(sc: Scanner): Expression {
	let d: Expression = disjunct(sc);
	while (sc.token == 'OR') {
		sc.advance();
		d = orFn(d, disjunct(sc));
	}
	return d;
}

//	disjunct = conjunct ('AND' conjunct)*

function disjunct(sc: Scanner): Expression {
	let c: Expression = conjunct(sc);
	while (sc.token == 'AND') {
		sc.advance();
		c = andFn(c, conjunct(sc));
	}
	return c;
}

//	conjunct = NOT conjunct
//		| nexpr '=' nexpr
//		| nexpr '<' nexpr
//		| nexpr '≤' nexpr
//		| nexpr '≠' nexpr
//		| nexpr '>' nexpr
//		| nexpr '≥' nexpr
//		| nexpr 'is' predicate
//		| nexpr

function conjunct(sc: Scanner): Expression {
	if (sc.token == 'NOT') {
		sc.advance();
		return notFn(conjunct(sc));
	}
	const e: Expression = nexpr(sc);
	switch (sc.token) {
	case '=': sc.advance(); return eqFn(e, nexpr(sc));
	case '<': sc.advance(); return ltFn(e, nexpr(sc));
	case '≤': sc.advance(); return leFn(e, nexpr(sc));
	case '≠': sc.advance(); return neFn(e, nexpr(sc));
	case '>': sc.advance(); return gtFn(e, nexpr(sc));
	case '≥': sc.advance(); return geFn(e, nexpr(sc));
	case 'is': sc.advance(); return predFn(predicate(sc), e);
	default: return e;
	}
}

// predicate: name of a unary boolean-valued function in predicates
function predicate(sc: Scanner): Predicate {
	const tok: string = sc.token;
	if (! (tok in predicates))
		sc.fail(`unknown predicate '${tok}'`);
	sc.advance();
	return predicates[tok] as Predicate;
}

//	nexpr	= term ('+' term | '-' term)*

function nexpr(sc: Scanner): Expression {
	let t: Expression = term(sc);
	while (true)
		switch (sc.token) {
		case '+': sc.advance(); t = plusFn(t, term(sc)); break;
		case '-': sc.advance(); t = minusFn(t, term(sc)); break;
		default: return t;
		}
}

//	term	= factor ('*' factor | 'DIV' factor | 'MOD' factor)*

function term(sc: Scanner): Expression {
	let f: Expression = factor(sc);
	while (true)
		switch (sc.token) {
		case '*': sc.advance(); f = multFn(f, factor(sc)); break;
		case 'DIV': sc.advance(); f = divFn(f, factor(sc)); break;
		case 'MOD': sc.advance(); f = modFn(f, factor(sc)); break;
		default: return f;
		}
}

//	factor	= '-' factor
//		| '(' expr ')'
//		| number
//		| 'true'
//		| 'false'
//		| id
//		| id '(' arglist ')'
//		| id '[' expr ']'
//		| id '[' expr '.' '.' expr ']'
//		| 'a' 'new' 'array' 'of' 'length' expr
//
function factor(sc: Scanner): Expression {
	if (sc.token == '-') {
		sc.advance();
		return negateFn(factor(sc));
	}
	if (sc.token == '(') {
		sc.advance();
		const e: Expression = expr(sc);
		sc.match(')');
		return e;
	}
	const v: string = sc.token;
	sc.advance();
	const matches = v.match(/^[0-9]+/) as RegExpMatchArray;
	if (matches)
		return constFn(Number(matches[0]));
	if (v == 'true')
		return constFn(true);
	if (v == 'false')
		return constFn(false);
	if (sc.token == '(')
		return callFn(v, arglist(sc));
	if (sc.token == '[') {
		sc.advance();
		const i: Expression = expr(sc);
		if (sc.current() == '.') {
			sc.advance();
			sc.match('.');
			const j: Expression = expr(sc);
			sc.match(']');
			return subarrayFn(v, i, j);
		}
		sc.match(']');
		return indexFn(v, i);
	}
	if (v == 'a' && sc.token == 'new') {
		sc.advance();
		sc.match('array');
		sc.match('of');
		sc.match('length');
		return newarrayFn(expr(sc));
	}
	for (let param of currentParams)
		if (param.sizeName == v)
			return lengthFn(param.paramName);
	return varFn(v);
}

//	arglist	= expr (',' expr)*

function arglist(sc: Scanner): Array<Expression> {
	sc.match('(');
	let args: Array<Expression> = [];
	args.push(expr(sc));
	while (sc.token == ',') {
		sc.advance();
		args.push(expr(sc));
	}
	sc.match(')');
	return args;
}

// operations on state functions
function constFn(n: Value): Expression {
	return function(s: State): Value { return n; };
}
function varFn(v: string): Expression {
	return function(s: State): Value { return s.localVars[v]; };
}
function indexFn(v: string, f: Expression): Expression {
	return function(s: State): Value { return s.localVars[v][f(s)]; };
}
function subarrayFn(v: string, f: Expression, g: Expression): Expression {
	return function(s: State): Value {
		const start: number = f(s);
		const finish: number = g(s);
		const a: Array<Value> = s.localVars[v];
		let result: Array<Value> = [];
		for (let i: number = start; i <= finish; i++)
			result.push(a[i]);
		return result;
	};
}
function newarrayFn(f: Expression): Expression {
	return function(s: State): Value {
		const size: number = f(s);
		let result: Array<Value> = [];
		for (let i: number = 0; i < size; i++)
			result.push('');
		s.grown = true;
		return result;
	};
}
function andFn(f: Expression, g: Expression): Expression {
	return function(s: State): boolean { return f(s) && g(s); };
}
function orFn(f: Expression, g: Expression): Expression {
	return function(s: State): boolean { return f(s) || g(s); };
}
function notFn(f: Expression): Expression {
	return function(s: State): boolean { return ! f(s); };
}
function eqFn(f: Expression, g: Expression): Expression {
	return function(s: State): boolean { return f(s) == g(s); };
}
function neFn(f: Expression, g: Expression): Expression {
	return function(s: State): boolean { return f(s) != g(s); };
}
function ltFn(f: Expression, g: Expression): Expression {
	return function(s: State): boolean { return f(s) < g(s); };
}
function leFn(f: Expression, g: Expression): Expression {
	return function(s: State): boolean { return f(s) <= g(s); };
}
function gtFn(f: Expression, g: Expression): Expression {
	return function(s: State): boolean { return f(s) > g(s); };
}
function geFn(f: Expression, g: Expression): Expression {
	return function(s: State): boolean { return f(s) >= g(s); };
}
function lengthFn(v: string): Expression {
	return function(s: State): number { return s.localVars[v].length; };
}
function negateFn(f: Expression): Expression {
	return function(s: State): number { return - f(s); };
}
function plusFn(f: Expression, g: Expression): Expression {
	return function(s: State): number { return f(s) + g(s); };
}
function minusFn(f: Expression, g: Expression): Expression {
	return function(s: State): number { return f(s) - g(s); };
}
function multFn(f: Expression, g: Expression): Expression {
	return function(s: State): number { return f(s) * g(s); };
}
function divFn(f: Expression, g: Expression): Expression {
	return function(s: State): number { return Math.floor(f(s) / g(s)); };
}
function modFn(f: Expression, g: Expression): Expression {
	return function(s: State): number {
		const x = f(s);
		const y = g(s);
		const d = Math.floor(x / y);
		return x - d*y;
	};
}
function predFn(p: Predicate, f: Expression): Expression {
	return function(s: State) { return p(f(s)); };
}

function callFn(name: string, args: Array<Expression>): Expression {
	// Built-in functions are executed directly
	if (typeof builtIn[name] !== 'undefined')
		return function(s: State) {
			return builtIn[name].apply(null, evalArgs(s, args));
		};

	// Function calls in the current line are collected and attached
	// to the Statement.  Before the statement is executed, these
	// calls are evaluated and their return values placed in the
	// returnValues component of the State.
	const fn = callsOnCurrentLine.length;
	callsOnCurrentLine.push(new FunctionCall(name, args));

	// When the expression is evaluated, just fetch the corresponding
	// return value.
	return function(s: State): Value {
		return s.returnValues[fn];
	};
}

// store the value somewhere among the variables
type Assignment = (s: State, v: Value) => void;

// store in the named variable
function assignVariable(x: string): Assignment {
	return function(s: State, v: Value): void {
		s.localVars[x] = v;
	};
}

// store at index in the named array variable
function assignArrayElement(a: string, ix: Expression): Assignment {
	return function(s: State, v: Value): void {
		s.localVars[a][ix(s)] = v;
	};
}

function evalArgs(state: State, args: Array<Expression>): Array<Value> {
	let actuals: Array<Value> = [];
	for (let arg of args)
		actuals.push(arg(state));
	return actuals;
}

// Statements

abstract class Statement {
	// number of textual lines in the statement
	readonly size: number;

	// function calls in the first line of the statement
	readonly fcalls: Array<FunctionCall>;

	// line number of the statement to execute after one step
	protected next: number;

	// line number of the statement to execute after this one
	// (control statements only)
	protected succ: number;

	constructor(size: number, fcalls: Array<FunctionCall>) {
		this.size = size;
		this.fcalls = fcalls;
	}

	// use the cursor to draw the statement with a given nesting
	abstract draw(cursor: Cursor, depth: number): void;

	// set next and (for control statements only) succ
	abstract patch(start: number, succ: number): void;

	// the sub-statement at the given offset from the start of this one
	abstract getStmt(offset: number): Statement;

	// add any variables set within the statement to the state
	abstract addLocals(state: Variables): void;

	// effect of the first line of the statement in single-step execution
	abstract execute(state: Machine): void;
}

class AssignStmt extends Statement {
	private readonly text: string;
	private readonly variable: string;
	private readonly lhs: Assignment;
	private readonly rhs: Expression;

	constructor(fcalls: Array<FunctionCall>, text: string, variable: string, lhs: Assignment, rhs: Expression) {
		super(1, fcalls);
		this.text = text;
		this.variable = variable;
		this.lhs = lhs;
		this.rhs = rhs;
	}

	draw(cursor: Cursor, depth: number): void {
		cursor.printLine(this.text, depth);
	}

	patch(start: number, succ: number): void { this.next = succ; };

	getStmt(offset: number): Statement { return this; }

	addLocals(state: Variables): void {
		addVariable(state, this.variable);
	}

	execute(state: Machine): void {
		const s: State = state.stack.localValues;
		this.lhs(s, this.rhs(s));
		state.stack.setPC(this.next);
	}
}

class ReturnStmt extends Statement {
	private readonly text: string;
	private readonly expr: Expression;

	constructor(fcalls: Array<FunctionCall>, text: string, expr: Expression) {
		super(1, fcalls);
		this.text = text;
		this.expr = expr;
	}

	draw(cursor: Cursor, depth: number): void {
		cursor.printLine(`RETURN ${this.text}`, depth);
	}

	patch(start: number, succ: number): void { this.next = start; }

	getStmt(offset: number): Statement { return this; }

	addLocals(state: Variables): void {}

	execute(state: Machine): void {
		state.returnValue(this.expr(state.stack.localValues));
	}
}

class CallStmt extends Statement {
	private readonly text: string;
	private readonly pname: string;
	private readonly args: Array<Expression>;

	constructor(fcalls: Array<FunctionCall>, text: string, pname: string, args: Array<Expression>) {
		super(1, fcalls);
		this.text = text;
		this.pname = pname;
		this.args = args;
	}

	draw(cursor: Cursor, depth: number): void {
		cursor.printLine(this.text, depth);
	}

	patch(start: number, succ: number): void { this.next = succ; }

	getStmt(offset: number): Statement { return this; }

	addLocals(state: Variables): void {}

	execute(state: Machine): void {
		const args: Array<Value> =
			evalArgs(state.stack.localValues, this.args);
		if (this.pname in builtIn) {
			builtIn[this.pname].apply(null, args);
			state.stack.setPC(this.next);
		} else {
			state.stack.returnAddress = this.next;
			const proc: Procedure = getProcedure(this.pname);
			const vars = proc.parameterValues(args);
			state.callProcedure(proc, vars);
		}
	}
}

class WhileStmt extends Statement {
	private readonly text: string;
	private readonly cond: Expression;
	private readonly body: Block;

	constructor(fcalls: Array<FunctionCall>, text: string, cond: Expression, body: Block) {
		super(body.size + 1, fcalls);
		this.text = text;
		this.cond = cond;
		this.body = body;
	}

	draw(cursor: Cursor, depth: number): void {
		cursor.printLine(`WHILE ${this.text}`, depth);
		this.body.draw(cursor, depth+1);
	}

	patch(start: number, succ: number): void {
		this.next = start+1;
		this.succ = succ;
		this.body.patch(start+1, start);
	}

	getStmt(offset: number): Statement {
		return offset == 0 ? this : this.body.getStmt(offset - 1);
	}

	addLocals(state: Variables): void {
		this.body.addLocals(state);
	}

	execute(state: Machine): void {
		state.stack.setPC(this.cond(state.stack.localValues) ? this.next : this.succ);
	}
}

class IfStmt extends Statement {
	private readonly text: string;
	private readonly cond: Expression;
	private readonly thenPart: Block;

	constructor(fcalls: Array<FunctionCall>, text: string, cond: Expression, thenPart: Block) {
		super(thenPart.size + 1, fcalls);
		this.text = text;
		this.cond = cond;
		this.thenPart = thenPart;
	}

	draw(cursor: Cursor, depth: number): void {
		cursor.printLine(`IF ${this.text}`, depth);
		this.thenPart.draw(cursor, depth+1);
	}

	patch(start: number, succ: number): void {
		this.next = start+1;
		this.succ = succ;
		this.thenPart.patch(start+1, succ);
	}

	getStmt(offset: number): Statement {
		if (offset == 0)
			return this;
		return this.thenPart.getStmt(offset - 1);
	}

	addLocals(state: Variables): void {
		this.thenPart.addLocals(state);
	}

	execute(state: Machine): void {
		state.stack.setPC(this.cond(state.stack.localValues) ? this.next : this.succ);
	}
}

class IfElseStmt extends Statement {
	private readonly text: string;
	private readonly cond: Expression;
	private readonly thenPart: Block;
	private readonly elsePart: Block;
	private readonly elseBlock: boolean; // else part on new line
	private elseLabel: number;

	constructor(fcalls: Array<FunctionCall>, text: string, cond: Expression, thenPart: Block, elsePart: Block, elseBlock: boolean) {
		super(thenPart.size + (elseBlock ? 2 : 1) + elsePart.size, fcalls);
		this.text = text;
		this.cond = cond;
		this.thenPart = thenPart;
		this.elsePart = elsePart;
		this.elseBlock = elseBlock;
	}

	draw(cursor: Cursor, depth: number): void {
		cursor.printLine(`IF ${this.text}`, depth);
		this.thenPart.draw(cursor, depth+1);
		if (this.elseBlock) {
			cursor.printLine("ELSE", depth);
			this.elsePart.draw(cursor, depth+1);
		} else {
			cursor.prefixNextLine("ELSE ");
			this.elsePart.draw(cursor, depth);
		}
	}

	patch(start: number, succ: number): void {
		this.next = start+1;
		this.succ = succ;
		this.thenPart.patch(start+1, succ);
		this.elseLabel = start +
			(this.elseBlock ? 2 : 1) + this.thenPart.size;
		this.elsePart.patch(this.elseLabel, succ);
	}

	getStmt(offset: number): Statement {
		if (offset == 0)
			return this;
		if (offset > this.thenPart.size)
			return this.elsePart.getStmt(offset - (this.elseBlock ? 2 : 1) - this.thenPart.size);
		return this.thenPart.getStmt(offset - 1);
	}

	addLocals(state: Variables): void {
		this.thenPart.addLocals(state);
		this.elsePart.addLocals(state);
	}

	execute(state: Machine): void {
		state.stack.setPC(this.cond(state.stack.localValues) ?
			this.next : this.elseLabel);
	}
}

// If variable is not already in state, add it uninitialized
function addVariable(state: Variables, variable: string): void {
	if (! (variable in state))
		state[variable] = '';
}

// sequence of statements
class Block {
	private readonly stmts: Array<Statement>;
	readonly size: number;

	constructor(stmts: Array<Statement>) {
		this.stmts = stmts;
		let count = 0;
		for (var stmt of this.stmts)
			count += stmt.size;
		this.size = count;
	}

	draw(cursor: Cursor, depth: number): void {
		for (var stmt of this.stmts)
			stmt.draw(cursor, depth);
	}

	patch(start: number, succ: number): void {
		const len: number = this.stmts.length;
		for (let i: number = 0; i < len-1; i++) {
			this.stmts[i].patch(start, start + this.stmts[i].size);
			start += this.stmts[i].size;
		}
		this.stmts[len-1].patch(start, succ);
	}

	getStmt(offset: number): Statement {
		let i: number = 0;
		while (offset >= this.stmts[i].size) {
			offset -= this.stmts[i].size;
			i++;
		}
		return this.stmts[i].getStmt(offset);
	}

	addLocals(state: Variables): void {
		for (var stmt of this.stmts)
			stmt.addLocals(state);
	}
}

// Interpretation of an expression
type Expression = (s: State) => Value;

class FunctionCall {
	readonly fname: string;
	readonly args: Array<Expression>;

	constructor(fname: string, args: Array<Expression>) {
		this.fname = fname;
		this.args = args;
	}
}

// parsed user-defined procedures and functions, added by getProcedure()
let definedProcedure = emptyDictionary<Procedure>();

// get cached procedure code
export function getProcedure(codeId: string): Procedure {
	if (typeof definedProcedure[codeId] === 'undefined')
		definedProcedure[codeId] = new Procedure(codeId);
	return definedProcedure[codeId];
}

// Pseudocode procedure
// codeId - HTML id of the DIV object containing
//	<div class="codeheader"> -> this.header -> this.params
//	<pre> -parser-> this.body
class Procedure {
	private readonly body: Block;
	private readonly params: Array<Parameter>;
	private readonly header: string;
	readonly size: number;

	constructor(codeId: string) {
		const node = document.getElementById(codeId) as HTMLElement;
		const children = node.childNodes as NodeListOf<HTMLElement>;
		const numChildren: number = children.length;
		let codeText: string = '';
		// this.header = first DIV, codeText = all PREs
		for (let i: number = 0; i < numChildren; i++) {
			const child: HTMLElement = children[i];
			if (child.nodeType == 1) { // element
				if (child.tagName == 'DIV' && ! this.header)
					this.header = child.textContent as string;
				else if (child.tagName == 'PRE')
					codeText += child.textContent as string;
			}
		}
		this.params = new Scanner(this.header).just(algHeader);
		currentParams = this.params; // used by code parser
		this.body = new Scanner(codeText).just(stmtlist);
		this.body.patch(0, this.body.size);
		this.size = this.body.size;
	}

	// assign positional arguments to parameter names
	parameterValues(vs: Array<Value>): Variables {
		let vars: Variables = emptyDictionary<Value>();
		for (let i in vs)
			vars[this.params[i].paramName] = vs[i];
		return vars;
	}

	addLocals(state: Variables): void {
		this.body.addLocals(state);
	}

	getStmt(offset: number): Statement {
		return this.body.getStmt(offset);
	}

	drawHeader(ctx: CanvasRenderingContext2D, x: number, y: number): void {
		ctx.fillText(this.header, x, y);
	}

	drawBody(cursor: Cursor): void {
		this.body.draw(cursor, 0);
	}

	// get declared name of the size of the named array
	getSizeName(aname: string): Maybe<string> {
		for (let param of this.params)
			if (param.paramName == aname)
				return param.sizeName ? param.sizeName : null;
		return null;
	}

	// default colour scheme for arrays
	cellColour(state: Variables, aname: string, i: number): string {
		return "white";
	}
}

type ArrayColourScheme = (s: Variables, a: string, i: number) => string;

// colour scheme for stepping through an array from left to right
export function leftToRightColour(arr: string, ix: number): ArrayColourScheme {
	return function(state: Variables, aname: string, i: number) {
		if (aname == arr) {
			let curr = state[ix];
			if (curr !== '') {
				if (i < curr)
					return ColourScheme.done;
				if (i == curr)
					return ColourScheme.highlight;
			}
		}
		return ColourScheme.plain;
	};
}

// Activation record for a procedure
class Activation {
	// horizontal display offset of the code
	codeOffset: number;
	// copy of local variables before current step
	private savedLocals: Variables;
	// line number of current statement
	private pc: number;

	readonly caller: Maybe<Activation>;
	readonly code: Procedure;
	displayHeight: number;
	localValues: State;
	returnAddress: number;
	result: Value;

	constructor(code: Procedure, args: Variables, caller: Maybe<Activation>) {
		this.caller = caller;
		this.code = code;
		this.pc = 0;
		this.result = null;

		this.localValues = {
			localVars: args, returnValues: [], grown: false };
		code.addLocals(this.localValues.localVars);
		this.saveState();
		this.setDimensions();
	}

	// recompute the dimensions of the display
	setDimensions(): void {
		let count: number = 0;
		// get the length of the largest array
		let arrayLen: number = 1;
		const vars: Variables = this.localValues.localVars;
		for (let v in vars)
			if (vars.hasOwnProperty(v)) {
				count++;
				const val: Value = vars[v];
				if (val instanceof Array && val.length > arrayLen)
					arrayLen = val.length;
			}
		if (this.result !== null) {
			count++;
			const val: Value = this.result;
			if (val instanceof Array && val.length > arrayLen)
				arrayLen = val.length;
		}

		this.codeOffset = codeParams.leftMargin +
			arrayLen*codeParams.cellWidth + codeParams.rightMargin;

		const codeHeight: number = codeParams.headerHeight + (this.code.size + 2)*codeParams.lineSpacing;
		const stateHeight: number = codeParams.cellHeight + 50*count;
		this.displayHeight = codeHeight > stateHeight ? codeHeight : stateHeight;
	}

	getPC(): number { return this.pc; }

	setPC(n: number): void {
		this.pc = n;
		this.localValues.returnValues = [];
	}

	saveState(): void {
		this.savedLocals = cloneVariables(this.localValues.localVars);
	}

	draw(canvas: HTMLCanvasElement, codeOffset: number, y: number, arrays: Arrays): void {
		this.drawState(canvas, y, arrays);
		this.drawCode(canvas, codeOffset, y);
	}

	private drawState(canvas: HTMLCanvasElement, ybase: number, arrays: Arrays): void {
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const localVars: Variables = this.localValues.localVars;
		const savedLocals: Variables = this.savedLocals;
		const x: number = codeParams.leftMargin;
		let y: number = ybase + codeParams.cellHeight;
		for (let attr in localVars) {
			ctx.textAlign = "right";
			const val = localVars[attr];
			const lastval = savedLocals[attr];
			const len = val instanceof Array ? val.length : 1;
			if (val instanceof Array) {
				arrays.addArray(val, y + codeParams.cellHeight/2 - 5);
				const sizeName: Maybe<string> = this.code.getSizeName(attr);
				ctx.font = "12px Arial";
				ctx.fillStyle = "#444";
				if (typeof sizeName !== 'undefined')
					ctx.fillText(`${sizeName} = ${len}`, x, y-8);
				for (let i: number = 0; i < len; i++)
					ctx.fillText(String(i), x + (i+1)*codeParams.cellWidth - 10, y-8);
			}
			ctx.font = "16px Arial";
			ctx.fillStyle = "black";
			ctx.fillText(attr, x-10, y+codeParams.baseLine);
			this.drawCells(ctx, attr, x, y-5, len);
			ctx.textAlign = "center";
			ctx.font = "bold 16px Arial";
			if (val instanceof Array) {
				for (let i: number = 0; i < len; i++) {
					ctx.fillStyle =
						val[i] === lastval[i] ? "black" : "red";
					ctx.fillText(val[i], x + (i+0.5)*codeParams.cellWidth, y+codeParams.baseLine);
				}
			} else {
				ctx.fillStyle = val === lastval ? "black" : "red";
				ctx.fillText(val, x+codeParams.cellWidth/2, y+codeParams.baseLine);
			}
			y += 50;
		}
		if (this.result !== null) {
			if (this.result instanceof Array)
				arrays.addArray(this.result, y + codeParams.cellHeight/2 - 5);
			this.drawResult(ctx, x, y, this.result);
		}
	}

	private drawResult(ctx: CanvasRenderingContext2D, x: number, y: number, val: Value): void {
		ctx.textAlign = "right";
		ctx.font = "16px Arial";
		ctx.fillStyle = "#c00";
		ctx.fillText("returns", x-5, y+codeParams.baseLine);
		const len: number = val instanceof Array ? val.length : 1;
		if (val instanceof Array) {
			ctx.font = "12px Arial";
			ctx.fillStyle = "#444";
			for (let i: number = 0; i < len; i++)
				ctx.fillText(String(i), x + (i+1)*codeParams.cellWidth - 10, y-8);
		}
		ctx.fillStyle = ColourScheme.plain;
		ctx.fillRect(x, y-5, len*codeParams.cellWidth, codeParams.cellHeight);
		this.drawBox(ctx, x, y-5, len);
		ctx.textAlign = "center";
		ctx.font = "bold 16px Arial";
		ctx.fillStyle = "red";
		if (val instanceof Array)
			for (let i: number = 0; i < len; i++)
				ctx.fillText(val[i], x + (i+0.5)*codeParams.cellWidth, y+codeParams.baseLine);
		else
			ctx.fillText(val, x+codeParams.cellWidth/2, y+codeParams.baseLine);
	}

	private drawCells(ctx: CanvasRenderingContext2D, attr: string, x: number, y: number, n: number): void {
		for (let i: number = 0; i < n; i++) {
			ctx.fillStyle = this.code.cellColour(this.localValues.localVars, attr, i);
			ctx.fillRect(x + i*codeParams.cellWidth, y, codeParams.cellWidth, codeParams.cellHeight);
		}
		this.drawBox(ctx, x, y, n);
	}

	private drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, len: number): void {
		ctx.lineWidth = 1;
		ctx.strokeStyle = "black";
		ctx.strokeRect(x, y, len*codeParams.cellWidth, codeParams.cellHeight);
		if (len > 1) {
			ctx.beginPath();
			for (let i: number = 0; i < len; i++) {
				ctx.moveTo(x + i*codeParams.cellWidth, y);
				ctx.lineTo(x + i*codeParams.cellWidth, y + codeParams.cellHeight);
			}
			ctx.stroke();
		}
	}

	private drawCode(canvas: HTMLCanvasElement, x: number, ybase: number): void {
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const width: number = canvas.offsetWidth;
		const y: number = ybase + codeParams.headerHeight + codeParams.lineSpacing;

		// procedure header
		ctx.textAlign = "left";
		ctx.fillStyle = codeParams.headerColour;
		ctx.fillRect(x, ybase, width-x, codeParams.headerHeight);
		ctx.fillStyle = "white";
		ctx.font = "18px Arial";
		this.code.drawHeader(ctx, x+20, ybase+20);

		// background for the current line
		ctx.fillStyle = codeParams.currentColour;
		ctx.fillRect(x, y + this.pc*codeParams.lineSpacing, width-x, codeParams.lineSpacing);

		// procedure body
		ctx.fillStyle = "black";
		ctx.font = "16px Arial";
		this.code.drawBody(new Cursor(ctx, x+20, y));
	}
}

// execution state
class Machine {
	private readonly initState: Variables;
	stack: Activation;
	finished: boolean;
	depth: number;

	constructor(codeId: string, args: Variables) {
		this.stack = new Activation(getProcedure(codeId), args, null);
		this.initState = cloneVariables(this.stack.localValues.localVars);
		this.finished = false;
		this.depth = 0;
	}

	// modify initial value of a variable
	setVar(id: string, value: Value): void {
		this.initState[id] = value;
	}

	saveState(): void {
		this.stack.saveState();
	}

	reset(): void {
		while (this.depth > 0)
			this.returnVoid();
		this.stack.localValues.localVars = cloneVariables(this.initState);
		this.stack.saveState();
		this.stack.setPC(0);
		this.stack.result = null;
		this.stack.setDimensions();
		this.finished = false;
	}

	step(): void {
		if (this.finished)
			return;
		const pc = this.stack.getPC();
		if (pc >= this.stack.code.size) {
			this.returnVoid();
			return;
		}
		const stmt: Statement = this.stack.code.getStmt(pc);
		const fcallsDone = this.stack.localValues.returnValues.length;
		if (stmt.fcalls.length > fcallsDone) {
			const fcall: FunctionCall = stmt.fcalls[fcallsDone];
			const args: Array<Value> =
				evalArgs(this.stack.localValues, fcall.args);
			const proc: Procedure = getProcedure(fcall.fname);
			const vars = proc.parameterValues(args);
			this.callProcedure(proc, vars);
		} else
			stmt.execute(this);
	}

	bigStep(): void {
		if (this.finished)
			return;
		const startPc: number = this.stack.getPC();
		const startDepth: number = this.depth;
		if (startPc >= this.stack.code.size) {
			this.returnVoid();
			return;
		}
		const stmt: Statement = this.stack.code.getStmt(startPc);
		do {
			this.step();
		} while (! this.finished &&
			(this.depth > startDepth ||
			 (this.depth == startDepth &&
			  this.stack.getPC() > startPc &&
			  this.stack.getPC() < startPc + stmt.size)));
	}

	callProcedure(proc: Procedure, vars: Variables): void {
		this.stack = new Activation(proc, vars, this.stack);
		this.depth++;
	}

	returnValue(v: Value): void {
		if (this.stack.caller !== null) {
			this.stack = this.stack.caller;
			this.depth--;
			this.stack.localValues.returnValues.push(v);
			this.step();
		} else {
			this.stack.result = v;
			this.stack.setDimensions();
			this.finished = true;
		}
	}

	returnVoid(): void {
		if (this.stack.caller !== null) {
			this.stack = this.stack.caller;
			this.depth--;
			this.stack.setPC(this.stack.returnAddress);
		} else
			this.finished = true;
	}

	displayHeight(): number {
		let height: number = 0;
		for (let s: Maybe<Activation> = this.stack; s !== null; s = s.caller)
			height += s.displayHeight;
		return height;
	}

	draw(canvas: HTMLCanvasElement): void {
		if (this.stack.localValues.grown) {
			this.stack.setDimensions();
			this.stack.localValues.grown = false;
		}

		let codeOffset: number = 0;
		for (let s: Maybe<Activation> = this.stack; s !== null; s = s.caller)
			if (s.codeOffset > codeOffset)
				codeOffset = s.codeOffset;

		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

		// background for the code
		ctx.fillStyle = codeParams.codeColour;
		ctx.fillRect(codeOffset, 0, canvas.width-codeOffset, canvas.height);

		let arrays = new Arrays();
		let y: number = canvas.height;
		for (let s: Maybe<Activation> = this.stack; s !== null; s = s.caller) {
			y -= s.displayHeight;
			s.draw(canvas, codeOffset, y, arrays);
		}

		arrays.drawLinks(ctx, codeOffset);

		// vertical line dividing the code from the state
		ctx.strokeStyle = codeParams.headerColour;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(codeOffset, 0);
		ctx.lineTo(codeOffset, canvas.height);
		ctx.stroke();

		// horizontal lines separating activation records
		ctx.strokeStyle = "black";
		ctx.lineWidth = 3;
		y = canvas.height;
		for (let s: Maybe<Activation> = this.stack; s !== null; s = s.caller) {
			y -= s.displayHeight;
			if (s.caller !== null) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(canvas.width, y);
				ctx.stroke();
			}
		}
	}
}

// y-positions of each drawn array (in reverse order)
interface ArrayEntry { arr: Array<Value>; ys: Array<number>; }

// record all the arrays in the current execution, and show sharing
class Arrays {
	private arrays: Array<ArrayEntry>;

	constructor() { this.arrays = []; }

	addArray(arr: Array<Value>, y:number): void {
		for (let entry of this.arrays)
			if (entry.arr === arr) {
				entry.ys.push(y);
				return;
			}
		this.arrays.push({ arr: arr, ys: [y] });
	}

	// draw links between shared arrays
	drawLinks(ctx: CanvasRenderingContext2D, width: number): void {
		let arrCount = 0;
		for (let entry of this.arrays)
			if (entry.ys.length > 1)
				arrCount++;
		if (arrCount == 0)
			return;
		let i = 0;
		for (let entry of this.arrays) {
			const ys: Array<number> = entry.ys;
			if (ys.length > 1) {
				const x: number = codeParams.leftMargin + entry.arr.length*codeParams.cellWidth + 1;
				const linex = width - codeParams.rightMargin*(arrCount-i)/(arrCount+1);
				ctx.strokeStyle = "#aaa";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(x, ys[0]);
				ctx.lineTo(linex, ys[0]);
				ctx.lineTo(linex, ys[ys.length - 1]);
				ctx.lineTo(x, ys[ys.length - 1]);
				for (let i = 1; i < ys.length - 1; i++) {
					ctx.moveTo(x, ys[i]);
					ctx.lineTo(linex, ys[i]);
				}
				// arrowhead
				const lasty = ys[ys.length - 1];
				ctx.moveTo(x+8, lasty-5);
				ctx.lineTo(x, lasty);
				ctx.lineTo(x+8, lasty+5);
				ctx.stroke();
				i++;
			}
		}
	}
}

// Applet for stepping through the execution of pseudocode
export class CodeApplet extends Applet {
	private state: Machine;
	private timeout: any;

	// canvasId - HTML id of the CANVAS object
	// codeId - HTML id of the pseudocode DIV object -> this.code
	// args - object containing the values of the arguments
	// other variables assigned in the code will be local
	constructor(canvasId: string, codeId: string, args: Variables) {
		super(canvasId, codeParams.stateColour);
		this.state = new Machine(codeId, cloneVariables(args));
		this.draw();
	}

	setVar(id: string, value: Value): void {
		this.state.setVar(id, value);
		this.reset();
	}

	// methods for control buttons

	reset(): void {
		this.state.reset();
		this.draw();
	}

	step(): void {
		this.state.saveState();
		this.state.step();
		this.draw();
	}

	bigStep(): void {
		this.state.saveState();
		this.state.bigStep();
		this.draw();
	}

	run(): void {
		if (! this.state.finished) {
			this.step();
			const self: CodeApplet = this;
			this.timeout = setTimeout(function() { self.run(); }, codeParams.timeStep);
		}
	}

	stop(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			delete this.timeout;
		}
	}

	private draw(): void {
		this.canvas.height = this.state.displayHeight();

		// background for the variable cells
		this.background();

		this.state.draw(this.canvas);
	}
}

// Cursor for drawing code
class Cursor {
	private readonly ctx: CanvasRenderingContext2D;
	private readonly x: number;
	private y: number;
	private prefix: string; // prefix for next line

	constructor(ctx: CanvasRenderingContext2D, x: number, y: number) {
		this.ctx = ctx;
		this.prefix = "";
		this.x = x;
		this.y = y + codeParams.baseLine;
	}

	prefixNextLine(prefix: string): void {
		this.prefix = prefix;
	}

	printLine(text: string, depth: number): void {
		this.ctx.fillText(this.prefix + text,
			this.x + depth*codeParams.indent, this.y);
		this.prefix = "";
		this.y += codeParams.lineSpacing;
	}
}

// clone of a collection of variables with values
function cloneVariables(state: Variables): Variables {
	let copy: Variables = emptyDictionary<Value>();
	for (let attr in state) {
		// entries are Array, String or Number
		copy[attr] = cloneValue(state[attr]);
	}
	return copy;
}

// clone of a value
function cloneValue(obj: Value): Value {
	// Handle String, Number, Boolean, null or undefined
	if (null == obj || "object" != typeof obj)
		return obj;

	if (obj instanceof Array) {
		let copy: Array<Value> = [];
		for (let i in obj)
			copy[i] = obj[i];
		return copy;
	}

	throw new Error("Unable to copy obj! Its type isn't supported.");
}

} // namespace CodeAppletImpl

import CodeApplet = CodeAppletImpl.CodeApplet;
import getProcedure = CodeAppletImpl.getProcedure;
import leftToRightColour = CodeAppletImpl.leftToRightColour;
