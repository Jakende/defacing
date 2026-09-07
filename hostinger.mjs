import { server } from './server.mjs';

server.listen(
  Number(process.env.PORT || 3000),
  process.env.HOST || '0.0.0.0',
  () => console.log('Deface server started')
);