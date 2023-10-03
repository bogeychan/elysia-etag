import Elysia from 'elysia';
import { etag } from '../src';

let myInsecureChangeCounter = 0;

const app = new Elysia()
  .use(
    etag({
      hash: (response) => {
        return (response as string) + myInsecureChangeCounter++;
      }
    })
  )
  .get('/', () => 'Checkout the response headers!')
  .listen(8080);

console.log(`Listening on http://${app.server!.hostname}:${app.server!.port}`);
