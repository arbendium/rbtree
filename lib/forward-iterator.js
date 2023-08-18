function* forwardOffsetIterator(n, offset) {
	if (!n) {
		yield offset;
	} else if (-offset === n._count) {
		yield* forwardIterator(n);
	} else if (-offset > n._count) {
		yield offset + n._count;
		yield* forwardIterator(n);
	} else if (n.right) {
		if (-offset === n.right._count + 1) {
			yield n;
			yield* forwardIterator(n.right);
		} else if (-offset > n.right._count + 1) {
			yield* forwardOffsetIterator(n.left, offset + n.right._count + 1);
			yield n;
			yield* forwardIterator(n.right);
		} else {
			yield* forwardOffsetIterator(n.right, offset);
		}
	} else {
		if (offset < -1) {
			yield* forwardOffsetIterator(n.left, offset + 1);
		}
		yield n;
	}
}

export function* keyedForwardIterator(key, offset, n, test) {
	function* iterate(n) {
		if (test(n.key, key)) {
			if (n.left) {
				yield* iterate(n.left);
			} else {
				yield;
			}
			yield n;
			if (n.right) {
				yield* forwardIterator(n.right);
			}
		} else if (n.right) {
			const it = iterate(n.right);
			const { value } = it.next();
			if (typeof value === 'number') {
				const offset = value;
				if (offset < -1) {
					yield* forwardOffsetIterator(n.left, offset + 1);
				}
				yield n;
			} else if (value) {
				yield value;
			} else {
				if (offset < 0) {
					yield* forwardOffsetIterator(n.left, offset);
				}
				yield n;
			}
			yield* it;
		} else {
			if (offset < 0) {
				yield* forwardOffsetIterator(n.left, offset);
			}
			yield n;
		}
	}

	const it = iterate(n);
	const { value: node } = it.next();

	if (offset > 0) {
		offset--;
	} else if (typeof node === 'object') {
		yield node;
	}

	while (offset-- > 0 && !it.next().done);

	yield* it;
}

export function* forwardIterator(node) {
	if (node.left) {
		yield* forwardIterator(node.left);
	}
	yield node;
	if (node.right) {
		yield* forwardIterator(node.right);
	}
}
