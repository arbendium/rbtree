# foundation-tree

A [fully persistent](https://en.wikipedia.org/wiki/Persistent_data_structure) tree data structure that's designed and optimized to behave like an ordered key-value database, specifically [FoundationDB](https://www.foundationdb.org/).

Compared to more established tree implementation (ie [function-red-black-tree](https://www.npmjs.com/package/functional-red-black-tree)), it:

 - supports [FoundationDB-style](https://apple.github.io/foundationdb/developer-guide.html#key-selectors) [key selectors](#key-selectors)
 - supports flexible key and range queries using key selectors
 - supports range deletion (not thoroughly optimized yet)
 - does not support duplicate keys - inserting a duplicate key would overwrite the old entry
 - uses JS stack and generators for iteration
 - provides ES6 iterators

# Documentation

Data structure properties:

 - The internal data structure is a [red-black tree](https://en.wikipedia.org/wiki/Red%E2%80%93black_tree)
 - Functional (or fully persistent) - modifications create a new data structure
 - Writing a duplicate key would overwrite the older entry.
 - Keys can be any JS value, given the appropriate comparison function.
 - Values can be any JS value. Though `get` method uses `undefined` to also represent a missing entry.

## API

### Symbol `beforeStart`

A virtual key used to signify a imaginary key _before_ all other keys in the tree.

### Symbol `afterEnd`

A virtual key used to signify a imaginary key _after_ all other keys in the tree.

### `Tree#constructor(compare, [root])`

Creates a tree.

**Arguments:**

 - `compare` - a stable comparison function for the keys
 - `root` - (optional) a valid tree node; used internallyy

**Returns:** A tree

### `Tree#length`

A number of nodes in a tree

### `Tree#get(key)`

Retrives a value from a tree.

**Arguments:**
 - `key` - a key to search for

**Returns:** A value associated with a key, or `undefined` in an entry does not exist

### `Tree#getKey(key, [inclusive], [offset])`

Retrives a specific key given a key selector.

**Arguments:**
 - `key`, `inclusive`, `offset` - a key selector to use in the search. See [key selectors](#key-selectors).

**Returns:** A matching key if found, or `beforeStart` if an imaginary matching key would be _before_ the first entry, or `afterEnd` if an imaginary matching key would be _after_ the last entry.

### `Tree#set(key, value)`

Sets (upserts) a key-value entry in the tree.

**Arguments:**
 - `key` - a key
 - `value` - a value

### `Tree#clear(key)`

Removes a key-value entry from the tree.

**Arguments:**
 - `key` - a key of an entry to remove

### `Tree#clearRange(start, end)`

Removes a range of key-value entries from the tree.

**Arguments:**
 - `start` - an _inclusive_ lower boundary of the range; can be `beforeStart` or `afterEnd`; in the latter case, the operation would be a no-op
 - `end` - an _exclusive_ higher boundary of the range, can be `beforeStart` or `afterEnd`; in the former case, the operation would be a no-op

## Key selectors

A _key selector_ is a triplet of arguments. Namely:

 - `key` - a base key to search for.
 - `inclusive` - a flag indicating whether in the case of exact match, a base key should be the matching key or a previous key; this argument is ignored if the base key is `beforeStart` or `afterEnd`.
 - `offset` - an integer offset counted from the base key,

By far the most common key selector has values `(baseKey, false, 1)` which would select the first key greater than or equal to the base key.

# Credits

 (c) 2023 Keijo Kapp. ISC License

A significant portion of tree manipulation and tree validity testing code is based on [function-red-black-tree](https://www.npmjs.com/package/functional-red-black-tree) with the following license:

```
The MIT License (MIT)

Copyright (c) 2013 Mikola Lysenko

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
