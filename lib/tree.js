import { backwardIterator, keyedBackwardIterator } from './backward-iterator.js';
import { forwardIterator, keyedForwardIterator } from './forward-iterator.js';

const RED = 0;
const BLACK = 1;

export const beforeStart = Symbol('before start');
export const afterEnd = Symbol('after end');

function recount(node) {
	node._count = 1 + (node.left ? node.left._count : 0) + (node.right ? node.right._count : 0);
}

export default class Tree {
	constructor(compare, root) {
		this._compare = compare;
		this.root = root;
	}

	get length() {
		return this.root ? this.root._count : 0;
	}

	* entries(reverse) {
		if (this.root) {
			const it = reverse
				? backwardIterator(this.root)
				: forwardIterator(this.root);

			for (const node of it) {
				yield [node.key, node.value];
			}
		}
	}

	* forwardIterator(key, inclusive, offset) {
		if (this.root) {
			const it = keyedForwardIterator(
				key,
				offset,
				this.root,
				inclusive
					? (a, b) => this._compare(a, b) > 0
					: (a, b) => this._compare(a, b) >= 0
			);

			for (const node of it) {
				yield [node.key, node.value];
			}
		}
	}

	* backwardIterator(key, inclusive, offset) {
		if (this.root) {
			const it = keyedBackwardIterator(
				key,
				offset,
				this.root,
				inclusive
					? (a, b) => this._compare(a, b) > 0
					: (a, b) => this._compare(a, b) >= 0
			);

			for (const node of it) {
				yield [node.key, node.value];
			}
		}
	}

	get(key) {
		if (key === beforeStart || key === afterEnd) {
			throw new TypeError(`Invalid key ${key.toString()}`);
		}

		return node(key, this.root, this._compare)?.value;
	}

	getKey(key, inclusive = false, offset = 1) {
		const node = findNode(key, inclusive, offset, this.root, this._compare);

		if (typeof node === 'number') {
			if (node < 0) {
				return beforeStart;
			}

			if (node > 0) {
				return afterEnd;
			}
		}

		return node.key;
	}

	set(key, value) {
		if (key === beforeStart || key === afterEnd) {
			throw new TypeError(`Invalid key ${key.toString()}`);
		}

		const compare = this._compare;
		const nStack = [];
		const dStack = [];

		for (let n = this.root; n;) {
			const d = compare(key, n.key);
			nStack.push(n);
			dStack.push(d);

			// prevent duplicate entries
			if (d === 0) {
				nStack[nStack.length - 1] = { ...n, value };
				for (let i = nStack.length - 2; i >= 0; --i) {
					const n = nStack[i];
					if (dStack[i] < 0) {
						nStack[i] = { ...n, left: nStack[i + 1] };
					} else {
						nStack[i] = { ...n, right: nStack[i + 1] };
					}
				}

				return new Tree(this._compare, nStack[0]);
			}

			if (d < 0) {
				n = n.left;
			} else {
				n = n.right;
			}
		}

		return new Tree(compare, insert(key, value, nStack, dStack));
	}

	clear(key) {
		if (key === beforeStart || key === afterEnd) {
			throw new TypeError(`Invalid key ${key.toString()}`);
		}

		const stack = find(this.root, key, this._compare);

		if (stack.length) {
			return new Tree(this._compare, remove(stack));
		}

		return this;
	}

	* getRange(
		start,
		startInclusive,
		startOffset,
		end,
		endInclusive,
		endOffset,
		{ limit, reverse } = {}
	) {
		const startNode = findNode(start, startInclusive, startOffset, this.root, this._compare);
		const endNode = findNode(end, endInclusive, endOffset, this.root, this._compare);

		let it;
		let stopNode;

		if (typeof startNode === 'number') {
			if (startNode < 0) {
				if (typeof endNode === 'number') {
					if (endNode > 0) {
						if (reverse) {
							it = backwardIterator(this.root);
						} else {
							it = forwardIterator(this.root);
						}
					}
				} else if (reverse) {
					it = keyedBackwardIterator(
						endNode.key,
						0,
						this.root,
						(a, b) => this._compare(a, b) >= 0
					);
				} else {
					it = forwardIterator(this.root);
					stopNode = endNode;
				}
			}
		} else if (typeof endNode === 'number') {
			if (endNode > 0) {
				if (reverse) {
					it = backwardIterator(this.root);
					stopNode = startNode;
				} else {
					it = keyedForwardIterator(
						startNode.key,
						1,
						this.root,
						(a, b) => this._compare(a, b) >= 0
					);
				}
			}
		} else if (this._compare(startNode.key, endNode.key) < 0) {
			if (reverse) {
				it = keyedBackwardIterator(
					endNode.key,
					0,
					this.root,
					(a, b) => this._compare(a, b) >= 0
				);

				stopNode = startNode;
			} else {
				it = keyedForwardIterator(
					startNode.key,
					1,
					this.root,
					(a, b) => this._compare(a, b) >= 0
				);

				stopNode = endNode;
			}
		}

		limit = Number.isInteger(limit) ? Math.max(limit, 0) : undefined;

		if (it) {
			for (const node of it) {
				if (node === stopNode || (limit !== undefined && limit-- === 0)) {
					return;
				}

				yield [node.key, node.value];
			}
		}
	}

	clearRange(start, end) {
		if (start === afterEnd || end === beforeStart) {
			return this;
		}

		const compare = this._compare;
		let stack = ge(this.root, start, compare);

		if (!stack[0] || (end !== afterEnd && compare(stack[stack.length - 1].key, end) >= 0)) {
			return this;
		}

		for (;;) {
			const root = remove(stack);

			stack = ge(root, start, compare);

			if (!stack[0] || (end !== afterEnd && compare(stack[stack.length - 1].key, end) >= 0)) {
				return new Tree(compare, root);
			}
		}
	}
}

function node(key, n, compare) {
	while (n) {
		const d = compare(key, n.key);
		if (d === 0) {
			return n;
		}
		if (d <= 0) {
			n = n.left;
		} else {
			n = n.right;
		}
	}
}

function find(n, key, compare) {
	const stack = [];
	let lastPtr = 0;
	while (n) {
		const d = compare(key, n.key);
		stack.push(n);
		if (d === 0) {
			lastPtr = stack.length;
		}
		if (d <= 0) {
			n = n.left;
		} else {
			n = n.right;
		}
	}
	stack.length = lastPtr;

	return stack;
}

function ge(n, key, compare) {
	const stack = [];

	if (key === beforeStart) {
		while (n) {
			stack.push(n);
			n = n.left;
		}
	} else {
		let lastPtr = 0;
		while (n) {
			const d = compare(key, n.key);
			stack.push(n);
			if (d <= 0) {
				lastPtr = stack.length;
				n = n.left;
			} else {
				n = n.right;
			}
		}
		stack.length = lastPtr;
	}

	return stack;
}

function backwardOffset(n, offset) {
	if (!n) {
		return offset;
	}

	for (;;) {
		if (n.right) {
			if (-offset <= n.right._count) {
				n = n.right;
				continue;
			}

			offset += n.right._count;
		}

		offset++;

		if (!offset) {
			return n;
		}

		if (n.left) {
			if (-offset > n.left._count) {
				return offset + n.left._count;
			}
			n = n.left;
		} else {
			return offset;
		}
	}
}

function forwardOffset(n, offset) {
	if (!n) {
		return offset;
	}

	for (;;) {
		if (n.left) {
			if (offset <= n.left._count) {
				n = n.left;
				continue;
			}

			offset -= n.left._count;
		}

		offset--;

		if (!offset) {
			return n;
		}

		if (n.right) {
			if (offset > n.right._count) {
				return offset - n.right._count;
			}
			n = n.right;
		} else {
			return offset;
		}
	}
}

function findNode(key, inclusive, offset, root, compare) {
	if (key === beforeStart) {
		if (offset > 0) {
			return forwardOffset(root, offset);
		}

		return offset - 1;
	}

	if (key === afterEnd) {
		if (offset < 0) {
			return backwardOffset(root, offset);
		}

		return offset + 1;
	}

	const test = inclusive
		? (a, b) => compare(a, b) > 0
		: (a, b) => compare(a, b) >= 0;

	function find(n) {
		if (test(n.key, key)) {
			if (n.left) {
				const v = find(n.left);

				if (typeof v === 'number') {
					if (v < 0) {
						return v;
					}

					if (v > 1) {
						return forwardOffset(n.right, v - 1);
					}

					return n;
				}

				return v;
			}

			if (offset === 1) {
				return n;
			}

			if (offset > 1) {
				return forwardOffset(n.right, offset - 1);
			}

			return offset - 1;
		}

		if (n.right) {
			const v = find(n.right);

			if (typeof v === 'number') {
				const offset = v;

				if (offset < -1) {
					return backwardOffset(n.left, offset + 1);
				}

				if (offset > 0) {
					return offset;
				}

				return n;
			}

			return v;
		}

		if (offset < 0) {
			return backwardOffset(n.left, offset);
		}

		if (offset > 0) {
			return offset;
		}

		return n;
	}

	return find(root);
}

function insert(key, value, nStack, dStack) {
	// Rebuild path to leaf node
	nStack.push({
		_color: RED,
		key,
		value,
		left: undefined,
		right: undefined,
		_count: 1
	});
	for (let s = nStack.length - 2; s >= 0; --s) {
		const n = nStack[s];
		if (dStack[s] < 0) {
			nStack[s] = { ...n, left: nStack[s + 1], _count: n._count + 1 };
		} else {
			nStack[s] = { ...n, right: nStack[s + 1], _count: n._count + 1 };
		}
	}

	// Rebalance tree using rotations
	for (let s = nStack.length - 1; s > 1; --s) {
		const p = nStack[s - 1];
		const n = nStack[s];
		if (p._color === BLACK || n._color === BLACK) {
			break;
		}
		const pp = nStack[s - 2];
		if (pp.left === p) {
			if (p.left === n) {
				const y = pp.right;
				if (y?._color === RED) {
					p._color = BLACK;
					pp.right = { ...y, _color: BLACK };
					pp._color = RED;
					s -= 1;
				} else {
					pp._color = RED;
					pp.left = p.right;
					p._color = BLACK;
					p.right = pp;
					nStack[s - 2] = p;
					nStack[s - 1] = n;
					recount(pp);
					recount(p);
					if (s >= 3) {
						const ppp = nStack[s - 3];
						if (ppp.left === pp) {
							ppp.left = p;
						} else {
							ppp.right = p;
						}
					}
					break;
				}
			} else {
				const y = pp.right;
				if (y?._color === RED) {
					p._color = BLACK;
					pp.right = { ...y, _color: BLACK };
					pp._color = RED;
					s -= 1;
				} else {
					p.right = n.left;
					pp._color = RED;
					pp.left = n.right;
					n._color = BLACK;
					n.left = p;
					n.right = pp;
					nStack[s - 2] = n;
					nStack[s - 1] = p;
					recount(pp);
					recount(p);
					recount(n);
					if (s >= 3) {
						const ppp = nStack[s - 3];
						if (ppp.left === pp) {
							ppp.left = n;
						} else {
							ppp.right = n;
						}
					}
					break;
				}
			}
		} else if (p.right === n) {
			const y = pp.left;
			if (y?._color === RED) {
				p._color = BLACK;
				pp.left = { ...y, _color: BLACK };
				pp._color = RED;
				s -= 1;
			} else {
				pp._color = RED;
				pp.right = p.left;
				p._color = BLACK;
				p.left = pp;
				nStack[s - 2] = p;
				nStack[s - 1] = n;
				recount(pp);
				recount(p);
				if (s >= 3) {
					const ppp = nStack[s - 3];
					if (ppp.right === pp) {
						ppp.right = p;
					} else {
						ppp.left = p;
					}
				}
				break;
			}
		} else {
			const y = pp.left;
			if (y?._color === RED) {
				p._color = BLACK;
				pp.left = { ...y, _color: BLACK };
				pp._color = RED;
				s -= 1;
			} else {
				p.left = n.right;
				pp._color = RED;
				pp.right = n.left;
				n._color = BLACK;
				n.right = p;
				n.left = pp;
				nStack[s - 2] = n;
				nStack[s - 1] = p;
				recount(pp);
				recount(p);
				recount(n);
				if (s >= 3) {
					const ppp = nStack[s - 3];
					if (ppp.right === pp) {
						ppp.right = n;
					} else {
						ppp.left = n;
					}
				}
				break;
			}
		}
	}

	// Return new tree
	nStack[0]._color = BLACK;

	return nStack[0];
}

function remove(stack) {
	// First copy path to node

	let v = stack[stack.length - 1];
	let n = { ...v };
	stack[stack.length - 1] = n;

	for (let i = stack.length - 2; i >= 0; --i) {
		const n = stack[i];

		if (stack[i].left === v) {
			v = n;
			stack[i] = { ...n, left: stack[i + 1] };
		} else {
			v = n;
			stack[i] = { ...n, right: stack[i + 1] };
		}
	}

	// If not leaf, then swap with previous node
	if (n.left && n.right) {
		// First walk to previous leaf
		const split = stack.length;
		const v = n;

		for (n = n.left; n.right; n = n.right) {
			stack.push(n);
		}

		// Copy path to leaf
		stack.push({ ...n, key: v.key, value: v.value });
		v.key = n.key;
		v.value = n.value;

		// Fix up stack
		for (let i = stack.length - 2; i >= split; --i) {
			stack[i] = { ...stack[i], right: stack[i + 1] };
		}

		v.left = stack[split];

		n = stack[stack.length - 1];
	}

	if (n._color === RED) {
		// Easy case: removing red leaf

		const p = stack[stack.length - 2];

		for (let i = 0; i < stack.length - 1; i++) {
			stack[i]._count--;
		}

		if (p.left === n) {
			p.left = undefined;
		} else if (p.right === n) {
			p.right = undefined;
		}

		return stack[0];
	}

	if (n.left || n.right) {
		// Second easy case:  Single child black parent

		for (let i = 0; i < stack.length - 1; ++i) {
			stack[i]._count--;
		}

		if (n.left) {
			Object.assign(n, n.left);
		} else if (n.right) {
			Object.assign(n, n.right);
		}

		// Child must be red, so repaint it black to balance color
		n._color = BLACK;

		return stack[0];
	}

	if (stack.length === 1) {
		// Third easy case: root

		return;
	}

	// Hard case: Repaint n, and then do some nasty stuff

	for (let i = 0; i < stack.length; ++i) {
		stack[i]._count--;
	}

	const p = stack[stack.length - 2];
	fixDoubleBlack(stack);

	// Fix up links
	if (p.left === n) {
		p.left = undefined;
	} else {
		p.right = undefined;
	}

	return stack[0];
}

function fixDoubleBlack(stack) {
	for (let i = stack.length - 1; i > 0; --i) {
		const n = stack[i];

		// console.log("visit node:", n.key, i, stack[i].key, stack[i-1].key)
		const p = stack[i - 1];

		if (p.left === n) {
			const s = p.right;

			if (s.right?._color === RED) {
				const s = { ...p.right };
				const z = { ...s.right };
				p.right = s.left;
				s.left = p;
				s.right = z;
				s._color = p._color;
				n._color = BLACK;
				p._color = BLACK;
				z._color = BLACK;
				recount(p);
				recount(s);
				if (i > 1) {
					const pp = stack[i - 2];
					if (pp.left === p) {
						pp.left = s;
					} else {
						pp.right = s;
					}
				}

				stack[i - 1] = s;

				return;
			}

			if (s.left?._color === RED) {
				const s = { ...p.right };
				const z = { ...s.left };
				p.right = z.left;
				s.left = z.right;
				z.left = p;
				z.right = s;
				z._color = p._color;
				p._color = BLACK;
				s._color = BLACK;
				n._color = BLACK;
				recount(p);
				recount(s);
				recount(z);
				if (i > 1) {
					const pp = stack[i - 2];
					if (pp.left === p) {
						pp.left = z;
					} else {
						pp.right = z;
					}
				}

				stack[i - 1] = z;

				return;
			}

			if (s._color === BLACK) {
				if (p._color === RED) {
					p._color = BLACK;
					p.right = { ...s, _color: RED };

					return;
				}

				// console.log("case 2: black sibling, black parent", p.right.value)
				p.right = { ...s, _color: RED };
			} else {
				// console.log("case 3: red sibling")
				const s = { ...p.right };
				p.right = s.left;
				s.left = p;
				s._color = p._color;
				p._color = RED;
				recount(p);
				recount(s);
				if (i > 1) {
					const pp = stack[i - 2];
					if (pp.left === p) {
						pp.left = s;
					} else {
						pp.right = s;
					}
				}

				stack[i - 1] = s;
				stack[i] = p;

				if (i + 1 < stack.length) {
					stack[i + 1] = n;
				} else {
					stack.push(n);
				}

				i += 2;
			}
		} else {
			const s = p.left;

			if (s.left?._color === RED) {
				const s = { ...p.left };
				const z = { ...s.left };
				p.left = s.right;
				s.right = p;
				s.left = z;
				s._color = p._color;
				n._color = BLACK;
				p._color = BLACK;
				z._color = BLACK;
				recount(p);
				recount(s);
				if (i > 1) {
					const pp = stack[i - 2];
					if (pp.right === p) {
						pp.right = s;
					} else {
						pp.left = s;
					}
				}

				stack[i - 1] = s;

				return;
			}

			if (s.right?._color === RED) {
				const s = { ...p.left };
				const z = { ...s.right };
				p.left = z.right;
				s.right = z.left;
				z.right = p;
				z.left = s;
				z._color = p._color;
				p._color = BLACK;
				s._color = BLACK;
				n._color = BLACK;
				recount(p);
				recount(s);
				recount(z);
				if (i > 1) {
					const pp = stack[i - 2];
					if (pp.right === p) {
						pp.right = z;
					} else {
						pp.left = z;
					}
				}

				stack[i - 1] = z;

				return;
			}

			if (s._color === BLACK) {
				if (p._color === RED) {
					p._color = BLACK;
					p.left = { ...s, _color: RED };

					return;
				}

				p.left = { ...s, _color: RED };
			} else {
				const s = { ...p.left };
				p.left = s.right;
				s.right = p;
				s._color = p._color;
				p._color = RED;
				recount(p);
				recount(s);
				if (i > 1) {
					const pp = stack[i - 2];
					if (pp.right === p) {
						pp.right = s;
					} else {
						pp.left = s;
					}
				}

				stack[i - 1] = s;
				stack[i] = p;

				if (i + 1 < stack.length) {
					stack[i + 1] = n;
				} else {
					stack.push(n);
				}

				i += 2;
			}
		}
	}

	stack[0]._color = BLACK;
}
