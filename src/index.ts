import type Elysia from 'elysia';

import { buildHashFn, canBeHashed, parseMatchHeader } from './utils';
import type { ETagHashData, ETagOptions, ETagContextApi } from './types';

export function etag(options: ETagOptions = {}) {
  if (typeof options.algorithm !== 'string') {
    options.algorithm = 'sha1';
  }

  const hash = buildHashFn(options as Required<ETagOptions>);

  return (app: Elysia) => {
    return app
      .derive((ctx) => {
        let matchEtagValues: string[];
        let noneMatchEtagValues: string[];

        return {
          setETag(etag) {
            ctx.set.headers['etag'] = etag;
          },
          buildETagFor(response) {
            return hash(response);
          },
          isMatch(etag) {
            if (!matchEtagValues) {
              matchEtagValues = parseMatchHeader(ctx.headers['if-match']);
            }

            return (
              matchEtagValues.includes(etag) || matchEtagValues.includes('*')
            );
          },
          isNoneMatch(etag) {
            if (!noneMatchEtagValues) {
              noneMatchEtagValues = parseMatchHeader(
                ctx.headers['if-none-match']
              );
            }

            return (
              noneMatchEtagValues.includes(etag) ||
              noneMatchEtagValues.includes('*')
            );
          },
          setVary(headers) {
            ctx.set.headers['vary'] =
              typeof headers === 'string' ? headers : headers.join(', ');
          }
        } satisfies ETagContextApi;
      })
      .onAfterHandle((ctx, response) => {
        let etag = ctx.set.headers['etag'];

        if (!etag) {
          if (!canBeHashed(response)) {
            return new Response(response as any, ctx.set);
          }

          etag = ctx.buildETagFor(response as ETagHashData);
          ctx.setETag(etag);
        }

        if (ctx.isNoneMatch(etag)) {
          switch (ctx.request.method) {
            case 'GET':
            case 'HEAD':
              ctx.set.status = 304; // Not Modified
              break;
            default:
              ctx.set.status = 412; // Precondition Failed
              break;
          }

          response = null;
        }

        return new Response(response as any, ctx.set);
      });
  };
}

export type { ETagHashFunction } from './types';
