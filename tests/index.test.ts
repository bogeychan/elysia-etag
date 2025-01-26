import { Elysia, ElysiaFile } from 'elysia'
import path from 'node:path'
import { etag } from '../src'
import type { ETagOptions } from '../src/types'

import { BunFile, CryptoHasher } from 'bun'
import { describe, expect, it } from 'bun:test'

const req = (
	path: string,
	headers?: Record<string, string>,
	method?: string,
	body?: string
) => new Request(`http://localhost${path}`, { headers, method, body })

describe('Etag - response', () => {
	class Input {
		constructor(public value: any) {}

		toJSON() {
			return this.value.constructor.name
		}
	}

	it.each([
		new Input('Hello World!'),
		new Input(new ArrayBuffer(42)),
		new Input(new Uint8Array(42)),
		new Input(new Uint16Array(42)),
		new Input(new Uint32Array(42)),
		new Input(new Int8Array(42)),
		new Input(new Int16Array(42)),
		new Input(new Int32Array(42)),
		new Input(new SharedArrayBuffer(42))
	])('%j', async ({ value }) => {
		const app = new Elysia().use(etag()).get('/', () => value)

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('sha1', value, 'base64') + '"'
		)
	})
})

describe('ETag - algorithms', () => {
	it('should throw an Error if used invalid algorithm', async () => {
		// @ts-expect-error algorithm
		expect(() => etag({ algorithm: 'invalid' })).toThrow()
	})

	it('strong md5', async () => {
		const app = new Elysia()
			.use(etag({ algorithm: 'md5' }))
			.get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('md5', 'Hello World!', 'base64') + '"'
		)
	})

	it('strong sha1', async () => {
		const app = new Elysia()
			.use(etag({ algorithm: 'sha1' }))
			.get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
		)
	})

	it('weak wyhash', async () => {
		const app = new Elysia()
			.use(etag({ algorithm: 'wyhash', weak: true }))
			.get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe('W/"' + Bun.hash('Hello World!') + '"')
	})

	it('default - strong sha1', async () => {
		const app = new Elysia().use(etag()).get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
		)
	})
})

describe('ETag - context api', () => {
	it('buildETagFor', async () => {
		const app = new Elysia().use(etag()).get('/', (ctx) => {
			const body = 'Hello World!'
			return ctx.buildETagFor(body)
		})

		const res = await app.handle(req('/'))

		expect(await res.text()).toBe(
			'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
		)
	})

	it('isMatch', async () => {
		const app = new Elysia().use(etag()).get('/', (ctx) => {
			const body = 'Hello World!'
			const etag = ctx.buildETagFor(body)
			return ctx.isMatch(etag)
		})

		// etag - true

		let res = await app.handle(
			req('/', {
				'if-match':
					'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
			})
		)

		expect(await res.text()).toBe('true')

		// etag - false

		res = await app.handle(
			req('/', {
				'if-match':
					'"' + CryptoHasher.hash('sha1', 'Hello Elysia!', 'base64') + '"'
			})
		)

		expect(await res.text()).toBe('false')

		// wildcard

		res = await app.handle(
			req('/', {
				'if-match': '*'
			})
		)

		expect(await res.text()).toBe('true')
	})

	it('isNoneMatch', async () => {
		const app = new Elysia().use(etag()).get('/', (ctx) => {
			const body = 'Hello World!'
			const etag = ctx.buildETagFor(body)
			return ctx.isNoneMatch(etag)
		})

		// etag - true

		let res = await app.handle(
			req('/', {
				'if-none-match':
					'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
			})
		)

		expect(await res.text()).toBe('true')

		// etag - false

		res = await app.handle(
			req('/', {
				'if-none-match':
					'"' + CryptoHasher.hash('sha1', 'Hello Elysia!', 'base64') + '"'
			})
		)

		expect(await res.text()).toBe('false')

		// wildcard

		res = await app.handle(
			req('/', {
				'if-none-match': '*'
			})
		)

		expect(await res.text()).toBe('true')
	})

	it('isNoneMatch - Not Modified', async () => {
		const app = new Elysia().use(etag()).head('/', (ctx) => {
			ctx.setETag(ctx.buildETagFor('Hello World!'))
		})

		const res = await app.handle(
			req(
				'/',
				{
					'if-none-match':
						'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
				},
				'HEAD'
			)
		)

		expect(res.status).toBe(304)
	})

	it('isNoneMatch - Precondition Failed', async () => {
		const app = new Elysia().use(etag()).post('/', (ctx) => {
			ctx.setETag(ctx.buildETagFor('Hello World!'))
		})

		const res = await app.handle(
			req(
				'/',
				{
					'if-none-match':
						'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
				},
				'POST'
			)
		)

		expect(res.status).toBe(412)
	})

	it('setVary', async () => {
		const app = new Elysia().use(etag()).post('/', (ctx) => {
			ctx.set.headers['accept'] = 'text/plain'
			ctx.setVary('accept')

			return ctx.body
		})

		const res = await app.handle(
			req('/', { 'Content-Type': 'text/plain' }, 'POST', 'Hello World!')
		)

		expect(res.headers.get('vary')).toBe('accept')
	})
})

describe('Etag - serialize', () => {
	class Input {
		constructor(
			public label: string,
			public value: any,
			public serialize: ETagOptions['serialize']
		) {}

		toJSON() {
			return this.label
		}
	}

	const JSONSerializer: ETagOptions['serialize'] = function (response) {
		if (typeof response === 'object') {
			return JSON.stringify(response)
		}
	}

	it.each([
		new Input('JSON - Object', { my: 'json' }, JSONSerializer),
		new Input('JSON - Array', [1, 2, 3, 4, 5], JSONSerializer),
		new Input(
			'BunFile',
			Bun.file(path.join(__dirname, '..', 'package.json')),
			function (response) {
				if (response instanceof Blob && 'lastModified' in response) {
					return (response as BunFile).lastModified.toString()
				}
			}
		)
	])('%j', async ({ value, serialize }) => {
		const expected = (await serialize!(value))!
		expect(expected).toBeDefined()

		const app = new Elysia().use(etag({ serialize })).get('/', () => value)

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('sha1', expected, 'base64') + '"'
		)
	})
})
