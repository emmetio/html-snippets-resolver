'use strict';

/**
 * Finds matching snippet from `registry` for given node and resolves it into
 * a parsed abbreviation via `parse` method. Given `node` is then updated
 * or replaced with matched abbreviation tree.
 *
 * A HTML registry basically contains aliases to another Emmet abbreviations,
 * e.g. a predefined set of name, attribues and so on, possibly a complex
 * abbreviation with multiple elements. So we have to get snippet, parse it
 * and recursively resolve it.
 *
 * @param  {Node} name                 Node to resolve
 * @param  {SnippetsRegistry} registry Registry with all available snippets
 * @param  {Function} parse            Function to transform snippet into a tree
 * @return {Node} Parsed abbreviation tree or `null` if snippet not found
 */
export default function(node, registry, parse) {
    const stack = new Set();
    const resolve = node => {
        const snippet = registry.resolve(node.name);
        // A snippet in stack means circular reference.
        // It can be either a user error or a perfectly valid snippet like
        // "img": "img[src alt]/", e.g. an element with predefined shape.
        // In any case, simply stop parsing and keep element as is
        if (!snippet || stack.has(snippet)) {
            return;
        }

        // In case if matched snippet is a function, pass control into it
        if (typeof snippet.value === 'function') {
            return snippet.value(node, registry, parse, resolve);
        }

        let tree;
        try {
            tree = parse(snippet.value);
        } catch (e) {
            throw new Error(`Unable to parse "${snippet.value}" snippet: ${e.message}`);
        }

        stack.add(snippet);
        tree.walk(resolve);
        stack.delete(snippet);

        // move current node contents into new tree
        const childTarget = findDeepestNode(tree);
        node.walk(resolve);
        while (node.firstChild) {
            childTarget.appendChild(node.firstChild);
        }

        // merge attributes from current node to generated ones
        while (tree.firstChild) {
            const merged = merge(node, tree.firstChild);
            node.parent.insertBefore(merged, node);
        }

        node.remove();
    };

    resolve(node);
}

/**
 * Adds data from first node into second node and returns it
 * @param  {Node} from
 * @param  {Node} to
 * @return {Node}
 */
function merge(from, to) {
    if (from.selfClosing) {
        to.selfClosing = true;
    }

    if (from.value != null) {
        to.value = from.value;
    }

    if (from.repeat) {
        to.repeat = Object.assign({}, from.repeat);
    }

    const attrs = from.attributes;
    for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        if (attr.name === 'class') {
            mergeClassNames(from, to);
        } else {
            to.setAttribute(attr);
        }
    }

    return to;
}

/**
 * Adds class names from first node to second one
 * @param  {Node} from
 * @param  {Node} to
 * @return {Node}
 */
function mergeClassNames(from, to) {
    const classNames = from.classList;
    for (let i = 0; i < classNames.length; i++) {
        to.addClass(classNames[i]);
    }

    return to;
}

/**
 * Finds node which is the deepest for in current node or node iteself.
 * @param  {Node} node
 * @return {Node}
 */
function findDeepestNode(node) {
	while (node.children.length) {
		node = node.children[node.children.length - 1];
	}

	return node;
}
