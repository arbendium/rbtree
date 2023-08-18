function* backwardOffsetIterator(n, offset) {
	if (!n) {
		yield offset;
	} else if (offset === n._count) {
		yield* backwardIterator(n);
	} else if (offset > n._count) {
		yield offset - n._count;
		yield* backwardIterator(n);
	} else if (n.left) {
		if (offset === n.left._count + 1) {
			yield n;
			yield* backwardIterator(n.left);
		} else if (offset > n.left._count + 1) {
			yield* backwardOffsetIterator(n.right, offset - n.left._count - 1);
			yield n;
			yield* backwardIterator(n.left);
		} else {
			yield* backwardOffsetIterator(n.left, offset);
		}
	} else {
		if (offset > 1) {
			yield* backwardOffsetIterator(n.right, offset - 1);
		}
		yield n;
	}
}

export function* keyedBackwardIterator(key, offset, n, test) {
	function* iterate(n) {
		if (test(n.key, key)) {
			if (n.left) {
				const it = iterate(n.left);
				const { done, value } = it.next();
				if (!done) {
					if (typeof value === 'number') {
						if (value > 1) {
							yield* backwardOffsetIterator(n.right, value - 1);
						}
						yield n;
						yield* it;
					} else {
						yield value;
						yield* it;
					}
				}
			} else if (offset > 0) {
				yield* backwardOffsetIterator(n, offset);
			}
		} else if (n.right) {
			yield* iterate(n.right);
			yield n;
			if (n.left) {
				yield* backwardIterator(n.left);
			}
		} else {
			if (offset > 0) {
				yield offset;
			}
			yield n;
			if (n.left) {
				yield* backwardIterator(n.left);
			}
		}
	}

	const it = iterate(n);
	const { value: node } = it.next();

	if (offset < 0) {
		offset++;
	} else if (typeof node === 'object') {
		yield node;
	}

	while (offset++ < 0 && !it.next().done);

	yield* it;
}

export function* backwardIterator(node) {
	if (node.right) {
		yield* backwardIterator(node.right);
	}

	yield node;

	if (node.left) {
		yield* backwardIterator(node.left);
	}
}
