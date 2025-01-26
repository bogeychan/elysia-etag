import { $ } from 'bun'

const outdir = './dist'

await $`rm -fr ${outdir}`

await Bun.build({
	target: 'bun',
	entrypoints: ['./src/index.ts'],
	minify: {
		syntax: true,
		whitespace: true,
		identifiers: false
	},
	outdir,
	external: ['elysia']
})

await $`tsc --project tsconfig.dts.json`
