import { test, expect } from '@playwright/test';

const apiUrl = process.env.TEST_API_URL ?? 'http://localhost:3001';

test.describe('Authentication and CORS flow', () => {
  test('should login and get protected profile using backend API request', async ({ request }) => {
    const loginResponse = await request.post(`${apiUrl}/auth/login`, {
      data: { username: 'user1', password: 'User123!' },
    });

    expect(loginResponse.ok()).toBe(true);
    const body = await loginResponse.json();
    expect(body.access_token).toBeTruthy();

    const profileResponse = await request.get(`${apiUrl}/auth/profile`, {
      headers: { Authorization: `Bearer ${body.access_token}` },
    });

    expect(profileResponse.ok()).toBe(true);
    const profile = await profileResponse.json();
    expect(profile.username).toBe('user1');
  });

  test('should allow API profile call with Authorization on cross-site', async ({ page }) => {
    await page.goto('/login');

    const loginResponse = await page.request.post(`${apiUrl}/auth/login`, {
      data: { username: 'user1', password: 'User123!' },
    });
    expect(loginResponse.ok()).toBe(true);
    const { access_token } = await loginResponse.json();

    const result = await page.evaluate(async ({ apiUrl, access_token }) => {
      const response = await window.fetch(`${apiUrl}/auth/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        credentials: 'include',
      });
      return { status: response.status, ok: response.ok };
    }, { apiUrl, access_token });

    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
  });
});
