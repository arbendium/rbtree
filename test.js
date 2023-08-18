import assert from 'node:assert';
import test, { describe } from 'node:test';
import Tree, { afterEnd, beforeStart } from './lib/tree.js';

// eslint-disable-next-line max-len
const sample = [112, 114, 138, 154, 109, 135, 125, 153, 116, 110, 143, 137, 99, 131, 140, 119, 121, 97, 158, 122, 152, 104, 130, 123, 100, 128, 127, 129, 148, 146, 98, 120, 102, 124, 117, 145, 151, 156, 155, 141, 105, 144, 149, 115, 132, 150, 147, 107, 101, 159, 126, 106, 113, 108, 136, 118, 111, 157, 103, 139, 142, 96, 133, 134];

function shuffle(a) {
	a = [...a];
	let currentIndex = a.length;

	while (currentIndex !== 0) {
		const randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[a[currentIndex], a[randomIndex]] = [a[randomIndex], a[currentIndex]];
	}

	return a;
}

function createTree() {
	return new Tree(Buffer.compare);
}

function assertValidTree(t) {
	if (!t.root) {
		return;
	}

	const RED = 0;
	const BLACK = 1;

	assert.strictEqual(t.root._color, BLACK, 'Root should be black');

	function checkNode(node) {
		if (!node) {
			return [1, 0];
		}

		if (node._color === RED) {
			assert(!node.left || node.left._color === 1, 'Reft child of red node should be black');
			assert(!node.right || node.right._color === 1, 'Right child of red node should be black');
		} else {
			assert.strictEqual(node._color, BLACK, 'Node color must be red or black');
		}

		if (node.left) {
			assert(Buffer.compare(node.left.key, node.key) <= 0, 'Left tree order invariant');
		}

		if (node.right) {
			assert(Buffer.compare(node.right.key, node.key) >= 0, 'Right tree order invariant');
		}

		const cl = checkNode(node.left);
		const cr = checkNode(node.right);

		assert.strictEqual(cl[0], cr[0], 'Number of black nodes along all paths to root must be constant');
		assert.strictEqual(cl[1] + cr[1] + 1, node._count, 'Item count consistency');

		return [cl[0] + node._color, cl[1] + cr[1] + 1];
	}

	const r = checkNode(t.root);
	assert.strictEqual(r[1], t.length);
}

describe('insert and upsert', () => {
	let t = createTree();
	assertValidTree(t);

	const sortedSample = sample.toSorted((a, b) => a - b);

	for (const e of sample) {
		t = t.set(Buffer.from([e]), e - 1);
		assertValidTree(t);
	}

	assert.deepStrictEqual([...t.entries()].map(([, value]) => value), sortedSample.map(a => a - 1));

	for (const e of sample) {
		t = t.set(Buffer.from([e]), e);
		assertValidTree(t);
	}

	assert.deepStrictEqual([...t.entries()].map(([, value]) => value), sortedSample);
});

describe('remove', () => {
	let t = createTree();
	assertValidTree(t);

	for (const e of sample) {
		t = t.set(Buffer.from([e]), e);
		assertValidTree(t);
	}

	let sortedSample = sample.toSorted((a, b) => a - b);
	const shuffledSample = shuffle(sample);

	for (let i = 0; i < shuffledSample.length; i++) {
		const e = shuffledSample[i];
		sortedSample = sortedSample.filter(s => s !== e);
		t = t.clear(Buffer.from([e]));
		assertValidTree(t);
		assert.deepStrictEqual([...t.entries()].map(([, value]) => value), sortedSample);
	}
});

describe('forwardIterator', async () => {
	function testForwardIteration(sample, inclusive, offset) {
		const t = sample.reduce((t, e) => t.set(Buffer.from([e]), e), createTree());
		assert.strictEqual(t.length, sample.length);
		const min = Math.min(...sample) - 3;
		const max = Math.max(...sample) + 3;
		assert(min >= 0 && max < 256);

		const reference = sample.toSorted((a, b) => a - b);

		for (let i = min; i <= max; i++) {
			// console.log(`--- ${sample.length} - ${i} - ${inclusive} - ${offset} ---`);
			let cutoff = reference.findLastIndex(inclusive ? (m => m <= i) : (m => m < i));

			cutoff = Math.min(Math.max(cutoff + offset, 0), reference.length);

			for (const [, value] of t.forwardIterator(Buffer.from([i]), inclusive, offset)) {
				assert.strictEqual(value, reference[cutoff]);

				cutoff++;
			}

			assert.strictEqual(cutoff, reference.length);
		}
	}

	for (let i = 0; i <= sample.length; i++) {
		for (let j = -10; j <= 10; j++) {
			await test(`sample-${i}-exclusive-offset-${j}`, () => testForwardIteration(sample.slice(0, i), false, j));
			await test(`sample-${i}-inclusive-offset-${j}`, () => testForwardIteration(sample.slice(0, i), true, j));
		}
	}
});

describe('backwardIterator', async () => {
	function testBackwardIteration(sample, inclusive, offset = 0) {
		const t = sample.reduce((t, e) => t.set(Buffer.from([e]), e), createTree());
		assert.strictEqual(t.length, sample.length);
		const min = Math.min(...sample) - 3;
		const max = Math.max(...sample) + 3;
		assert(min >= 0 && max < 256);

		const reference = sample.toSorted((a, b) => b - a);

		for (let j = min; j <= max; j++) {
			// console.log(`--- ${sample.length} - ${j} - ${inclusive} - ${offset} ---`);
			let cutoff = reference.findIndex(inclusive ? (m => m <= j) : (m => m < j));
			if (cutoff === -1) {
				cutoff = reference.length;
			}

			cutoff = Math.min(Math.max(cutoff - offset, 0), reference.length);

			for (const [, value] of t.backwardIterator(Buffer.from([j]), inclusive, offset)) {
				// console.log(value);
				assert.strictEqual(value, reference[cutoff]);

				cutoff++;
			}

			assert.strictEqual(cutoff, reference.length);
		}
	}

	for (let i = 0; i <= sample.length; i++) {
		for (let j = -10; j <= 10; j++) {
			await test(`sample-${i}-exclusive-offset-${j}`, () => testBackwardIteration(sample.slice(0, i), false, j));
			await test(`sample-${i}-inclusive-offset-${j}`, () => testBackwardIteration(sample.slice(0, i), true, j));
		}
	}
});

describe('clearRange', async () => {
	function clearRange(sample) {
		const tree = sample.reduce((t, e) => t.set(Buffer.from([e]), e), createTree());
		const sortedSample = sample.toSorted((a, b) => a - b);
		const min = Math.min(...sample) - 3;
		const max = Math.max(...sample) + 3;
		assert(min >= 0 && max < 256);

		for (let i = min; i <= max; i++) {
			for (let j = min; j <= max; j++) {
				// console.log(`--- ${sample.length} - ${i} - ${j}`);
				const s = sortedSample.filter(a => a < i || a >= j);
				const t = tree.clearRange(Buffer.from([i]), Buffer.from([j]));
				assertValidTree(t);
				assert.deepStrictEqual([...t.entries()].map(([, value]) => value), s);
			}

			const s1 = sortedSample.filter(a => a < i);
			const t1 = tree.clearRange(Buffer.from([i]), afterEnd);
			assertValidTree(t1);
			assert.deepStrictEqual([...t1.entries()].map(([, value]) => value), s1);

			const s2 = sortedSample.filter(a => a >= i);
			const t2 = tree.clearRange(beforeStart, Buffer.from([i]));
			assertValidTree(t2);
			assert.deepStrictEqual([...t2.entries()].map(([, value]) => value), s2);
		}
	}

	for (let i = 0; i < sample.length; i++) {
		await test(`clearRange-${i}`, () => clearRange(sample.slice(0, i)));
	}
});

describe('getKey', async () => {
	const tree = sample.reduce((t, e) => t.set(Buffer.from([e]), e), createTree());
	const sortedSample = sample.toSorted((a, b) => a - b);
	const min = Math.min(...sample) - 3;
	const max = Math.max(...sample) + 3;
	assert(min >= 0 && max < 256);

	function testGetKey(inclusive, offset) {
		for (let i = min; i <= max; i++) {
			// console.log(`--- ${i} - ${offset}`);
			let s = sortedSample.findLastIndex(inclusive ? (a => a <= i) : (a => a < i));

			s += offset;

			if (s < 0) {
				s = beforeStart;
			} else if (s >= sample.length) {
				s = afterEnd;
			} else {
				s = sortedSample[s];
			}

			const t = tree.getKey(Buffer.from([i]), inclusive, offset);

			assert.strictEqual(typeof t === 'symbol' ? t : t[0], s);
		}
	}

	for (let i = -10; i <= 10; i++) {
		await test(`exclusive-${i}`, () => testGetKey(false, i));

		await test(`inclusive-${i}`, () => testGetKey(true, i));

		await test(`beforeStart-${i}`, () => {
			const s = i < 1 ? beforeStart : sortedSample[i - 1];

			const t = tree.getKey(beforeStart, undefined, i);

			assert.strictEqual(typeof t === 'symbol' ? t : t[0], s);
		});

		await test(`afterEnd-${i}`, () => {
			const s = i > -1 ? afterEnd : sortedSample[sortedSample.length + i];

			const t = tree.getKey(afterEnd, undefined, i);

			assert.strictEqual(typeof t === 'symbol' ? t : t[0], s);
		});
	}
});

describe.skip('getRange', async () => {
	function getRange(sample) {
		const tree = sample.reduce((t, e) => t.set(Buffer.from([e]), e), createTree());
		const sortedSample = sample.toSorted((a, b) => a - b);
		const min = Math.min(...sample) - 3;
		const max = Math.max(...sample) + 3;
		assert(min >= 0 && max < 256);

		for (let i = min; i <= max; i++) {
			for (let j = min; j <= max; j++) {
				// console.log(`--- ${sample.length} - ${i} - ${j}`);
				const s = sortedSample.filter(a => a >= i && a < j);
				const it = tree.getRange(
					Buffer.from([i]),
					false,
					1,
					Buffer.from([j]),
					false,
					1
				);
				const result = [...it];
				assert.deepStrictEqual(result.map(([, value]) => value), s);
			}
		}
	}

	for (let i = 1; i < 2; i++) {
		await test(`getRange-${i}`, () => getRange(sample.slice(0, i)));
	}
});
