import Elysia from 'elysia';

import { buildHashFn, canBeHashed, parseMatchHeader } from './utils';
import type { ETagHashData, ETagOptions, ETagContextApi } from './types';

export function etag(options: ETagOptions = {}) {
  if (typeof options.algorithm !== 'string') {
    options.algorithm = 'sha1';
  }

  const hash = buildHashFn(options as Required<ETagOptions>);

  return new Elysia({ name: '@bogeychan/elysia-etag' })
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
    .onAfterHandle((ctx) => {
      let etag = ctx.set.headers['etag'];

      if (!etag) {
        if (!canBeHashed(ctx.response)) {
          return;
        }

        etag = ctx.buildETagFor(ctx.response as ETagHashData);
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

        ctx.response = null;
      }
    });
}

export type { ETagHashFunction } from './types';

