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

        const tree = parse(snippet.value);

        stack.add(snippet);
        tree.walk(resolve);
        stack.delete(snippet);

        // move current node contents into new tree
        const childTarget = findDeepestNode(tree);
        merge(childTarget, node);

        while (tree.firstChild) {
            node.parent.insertBefore(tree.firstChild, node);
        }

        childTarget.parent.insertBefore(node, childTarget);
        childTarget.remove();
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
    to.name = from.name;

    if (from.selfClosing) {
        to.selfClosing = true;
    }

    if (from.value != null) {
        to.value = from.value;
    }

    if (from.repeat) {
        to.repeat = Object.assign({}, from.repeat);
    }

    return mergeAttributes(from, to);
}

/**
 * Transfer attributes from first element to second one and preserve first
 * element’s attributes order
 * @param  {Node} from
 * @param  {Node} to
 * @return {Node}
 */
function mergeAttributes(from, to) {
    mergeClassNames(from, to);

    // TODO merge implied attributes

    // It’s important to preserve attributes order: ones in `from` have higher
    // pripority than in `to`. Collect attributes in map in order they should
    // appear in `to`
    const attrMap = new Map();

    let attrs = from.attributes;
    for (let i = 0; i < attrs.length; i++) {
        const attr = from.getAttribute(attrs[i].name);
        attrMap.set(attr.name, attr.clone());
    }

    attrs = to.attributes;
    for (let i = 0; i < attrs.length; i++) {
        const attr = to.getAttribute(attrs[i].name);
        if (attrMap.has(attr.name)) {
            const a = attrMap.get(attr.name);
            a.value = attr.value;
        } else {
            attrMap.set(attr.name, attr);
        }

        to.removeAttribute(attr);
    }

    const attrNames = Array.from(attrMap.keys());
    for (let i = 0; i < attrNames.length; i++) {
        to.setAttribute(attrMap.get(attrNames[i]));
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
