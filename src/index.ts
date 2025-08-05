import { Elysia } from 'elysia'

import { buildHashFn, canBeHashed, parseMatchHeader } from './utils'
import type { ETagOptions, ETagContextApi } from './types'

export function etag(options: ETagOptions = {}) {
	if (typeof options.algorithm !== 'string') {
		options.algorithm = 'sha1'
	}

	const { serialize } = options

	const hash = buildHashFn(options as Required<ETagOptions>)

	return new Elysia({ name: '@bogeychan/elysia-etag', seed: options })
		.derive((ctx) => {
			let matchEtagValues: string[]
			let noneMatchEtagValues: string[]

			return {
				setETag(etag) {
					ctx.set.headers['etag'] = etag
				},
				buildETagFor(response) {
					return hash(response)
				},
				isMatch(etag) {
					if (!matchEtagValues) {
						matchEtagValues = parseMatchHeader(ctx.headers['if-match'])
					}

					return matchEtagValues.includes(etag) || matchEtagValues.includes('*')
				},
				isNoneMatch(etag) {
					if (!noneMatchEtagValues) {
						noneMatchEtagValues = parseMatchHeader(ctx.headers['if-none-match'])
					}

					return (
						noneMatchEtagValues.includes(etag) ||
						noneMatchEtagValues.includes('*')
					)
				},
				setVary(headers) {
					ctx.set.headers['vary'] =
						typeof headers === 'string' ? headers : headers.join(', ')
				}
			} satisfies ETagContextApi
		})
		.onAfterHandle(async (ctx) => {
			const { request, set, response } = ctx
			let etag = set.headers['etag']

			if (!etag) {
				let toHash: Bun.StringOrBuffer | undefined

				if (canBeHashed(response)) {
					toHash = response
				} else {
					if (typeof serialize === 'function') {
						toHash = await serialize(response)
					}
					if (typeof toHash === 'undefined') {
						return
					}
				}

				etag = ctx.buildETagFor(toHash)
				ctx.setETag(etag)
			}

			if (ctx.isNoneMatch(etag)) {
				switch (request.method) {
					case 'GET':
					case 'HEAD':
						set.status = 304 // Not Modified
						break
					default:
						set.status = 412 // Precondition Failed
						break
				}

				// @ts-ignore
				ctx.response = null
			}
		})
		.as('global')
}

export type { ETagHashFunction } from './types'
