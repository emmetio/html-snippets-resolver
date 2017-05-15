export default {
	entry: './index.js',
	external: ['@emmetio/abbreviation'],
	targets: [
		{format: 'cjs', dest: 'dist/html-snippets-resolver.cjs.js'},
		{format: 'es',  dest: 'dist/html-snippets-resolver.es.js'}
	]
};
