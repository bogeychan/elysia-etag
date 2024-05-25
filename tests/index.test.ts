import { Elysia } from 'elysia'
import { etag } from '../src'

import { describe, expect, it } from 'bun:test'

const req = (
	path: string,
	headers?: Record<string, string>,
	method?: string,
	body?: string
) => new Request(`http://localhost${path}`, { headers, method, body })

describe('ETag - algorithms', () => {
	it('should throw an Error if used invalid algorithm', async () => {
		// @ts-ignore algorithm
		expect(() => etag({ algorithm: 'invalid' })).toThrow()
	})

	it('strong md5', async () => {
		const app = new Elysia()
			.use(etag({ algorithm: 'md5' }))
			.get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' +
				new Bun.CryptoHasher('md5').update('Hello World!').digest('base64') +
				'"'
		)
	})

	it('strong sha1', async () => {
		const app = new Elysia()
			.use(etag({ algorithm: 'sha1' }))
			.get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' +
				new Bun.CryptoHasher('sha1').update('Hello World!').digest('base64') +
				'"'
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
			'"' +
				new Bun.CryptoHasher('sha1').update('Hello World!').digest('base64') +
				'"'
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
			'"' +
				new Bun.CryptoHasher('sha1').update('Hello World!').digest('base64') +
				'"'
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
					'"' +
					new Bun.CryptoHasher('sha1').update('Hello World!').digest('base64') +
					'"'
			})
		)

		expect(await res.text()).toBe('true')

		// etag - false

		res = await app.handle(
			req('/', {
				'if-match':
					'"' +
					new Bun.CryptoHasher('sha1')
						.update('Hello Elysia!')
						.digest('base64') +
					'"'
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
					'"' +
					new Bun.CryptoHasher('sha1').update('Hello World!').digest('base64') +
					'"'
			})
		)

		expect(await res.text()).toBe('true')

		// etag - false

		res = await app.handle(
			req('/', {
				'if-none-match':
					'"' +
					new Bun.CryptoHasher('sha1')
						.update('Hello Elysia!')
						.digest('base64') +
					'"'
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
						'"' +
						new Bun.CryptoHasher('sha1')
							.update('Hello World!')
							.digest('base64') +
						'"'
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
						'"' +
						new Bun.CryptoHasher('sha1')
							.update('Hello World!')
							.digest('base64') +
						'"'
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
