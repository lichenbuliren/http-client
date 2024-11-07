// HttpClient.test.ts
import HttpClient from '../src/HttpClient';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(axios);

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    mock.reset();
    httpClient = new HttpClient('https://example.com/api', {
      'Content-Type': 'application/json',
    });
  });

  it('should not start multiple authentications concurrently', async () => {
    // Mock initial 100025 error for two requests
    mock.onGet('/test1').replyOnce(401, { code: 100025 });
    mock.onGet('/test2').replyOnce(401, { code: 100025 });

    // Mock successful authentication response
    mock.onPost('/auth').reply(200, { token: 'new-token' });

    // Mock successful retries
    mock.onGet('/test1').reply(200, { data: 'retried-1' });
    mock.onGet('/test2').reply(200, { data: 'retried-2' });

    // Trigger both requests
    const [response1, response2] = await Promise.all([
      httpClient.get('/test1'),
      httpClient.get('/test2'),
    ]);

    expect(response1).toEqual({ data: 'retried-1' });
    expect(response2).toEqual({ data: 'retried-2' });

    // Ensure authentication was only called once
    expect(mock.history.post.filter(req => req.url === '/auth').length).toBe(1);
  });
});
