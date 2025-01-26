import type { SupportedCryptoAlgorithms } from 'bun'
import type { MaybePromise } from 'elysia'

export type ETagOptions = {
	/**
	 * @default "sha1"
	 * @see https://bun.sh/docs/api/hashing
	 */
	algorithm?: ETagHashAlgorithm
	/**
	 * @default false
	 */
	weak?: boolean
	/**
	 * Provide your own hash function.
	 *
	 * If `hash` is provided option `algorithm` is ignored.
	 */
	hash?: ETagHashFunction
	/**
	 * Converts incompatible data to a hashable format.
	 *
	 * @returns `undefined` if unsupported.
	 */
	serialize?: (response: unknown) => MaybePromise<ETagHashData | undefined>
}

export type ETagHashAlgorithm = 'wyhash' | SupportedCryptoAlgorithms
export type ETagHashData = Bun.StringOrBuffer
export type ETagHashFunction = (response: ETagHashData) => string

export type ETagContextApi = {
	/**
	 * @see https://http.dev/etag
	 * @see https://www.rfc-editor.org/rfc/rfc2616#section-14.19
	 */
	setETag(etag: string): void
	buildETagFor(response: ETagHashData): string
	/**
	 * @see https://http.dev/if-match
	 * @see https://www.rfc-editor.org/rfc/rfc2616#section-14.24
	 */
	isMatch(etag: string): boolean
	/**
	 * @see https://http.dev/if-none-match
	 * @see https://www.rfc-editor.org/rfc/rfc2616#section-14.26
	 */
	isNoneMatch(etag: string): boolean
	/**
	 * @see https://http.dev/vary
	 * @see https://www.rfc-editor.org/rfc/rfc2616#section-14.44
	 */
	setVary(headers: '*' | string | string[]): void
}
