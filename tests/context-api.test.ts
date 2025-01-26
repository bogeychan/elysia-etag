import { Elysia } from 'elysia'
import { etag } from '../src'

import { CryptoHasher } from 'bun'
import { describe, expect, it } from 'bun:test'
import { req } from './utils'

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
