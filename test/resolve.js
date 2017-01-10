const assert = require('assert');
const parse = require('@emmetio/abbreviation');
const htmlTransform = require('@emmetio/html-transform');
const createRegistry = require('@emmetio/snippets-registry').default;
require('babel-register');
const resolve = require('../').default;
const stringify = require('./assets/stringify').default;

describe('Resolver', () => {
    const registry = createRegistry();
    registry.add({
        'a': 'a[href]',
        'img': 'img[src alt]/',
        'link': 'link[rel=stylesheet !type !title href]/',
		'link:css': 'link[href="${1:style}.css"]',
		'link:css2': 'link[href="style2.css"]',
        'link:rss': 'link[rel=alternate type=application/rss+xml title=RSS href="${1:rss.xml}"]',
        'area': "area[shape coords href alt]/",
    	'area:d': "area[shape=default]",
        'bq': 'blockquote',
        'adr': 'address',
        'str': 'strong',
        'meta': 'meta/',
        '!!!': '{<!DOCTYPE html>\n}',
        'doc': 'html>(head>meta[charset=UTF-8]+title{${1:Document}})+body',
        '!': '!!!+doc',
        fn(node) {
            node.value = 'fn value' + (node.repeat ? ' ' + node.repeat.value : '');
        }
    });

    const expand = (abbr, content) => {
        const tree = parse(abbr).use(resolve, registry).use(htmlTransform, content);
        return stringify(tree);
    };

    it('simple resolve', () => {
        assert.equal(expand('bq.a>bq.b+bq.c'), '<blockquote class="a"><blockquote class="b"></blockquote><blockquote class="c"></blockquote></blockquote>');
        assert.equal(expand('a.test{text}'), '<a href="" class="test">text</a>');
        assert.equal(expand('str>.a'), '<strong><span class="a"></span></strong>');
        assert.equal(expand('link:css2'), '<link rel="stylesheet" href="style2.css" />');
        assert.equal(expand('link:rss'), '<link rel="alternate" type="application/rss+xml" title="RSS" href="${1:rss.xml}" />');
        assert.equal(expand('area:d'), '<area shape="default" coords="" href="" alt="" />');
        assert.equal(expand('doc'), '<html><head><meta charset="UTF-8" /><title>${1:Document}</title></head><body></body></html>');
        assert.equal(expand('!'), '<!DOCTYPE html>\n<html><head><meta charset="UTF-8" /><title>${1:Document}</title></head><body></body></html>');
    });

    it('with repeater', () => {
        assert.equal(expand('a.test{text $}*2>.b'), '<a*2@1 href="" class="test">text 1<span class="b"></span></a><a*2@2 href="" class="test">text 2<span class="b"></span></a>');
        assert.equal(expand('div>a.test*>.b', ['foo', 'bar']), '<div><a*2@1 href="" class="test"><span class="b">foo</span></a><a*2@2 href="" class="test"><span class="b">bar</span></a></div>');
    });

    it('function match', () => {
        assert.equal(expand('span>fn*2>str'), '<span><fn*2@1>fn value 1<strong></strong></fn><fn*2@2>fn value 2<strong></strong></fn></span>');
    });
});
