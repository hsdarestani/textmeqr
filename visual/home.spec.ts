import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('desktop landing looks complete', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /DEIN AUTO/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Jetzt QR-Code erstellen/ })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'visual-artifacts/desktop.png', fullPage: true, animations: 'disabled' });
});

test('mobile landing has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /DEIN AUTO/ })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'visual-artifacts/mobile.png', fullPage: true, animations: 'disabled' });
});

test('scan route renders visitor UI on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/public/*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"active":true}' }));
  await page.goto('/q/AbcdEfghIjklMnopQrStUv');
  await expect(page.getByRole('heading', { name: /ETWAS/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Hinweis senden/ })).toBeVisible();
  await page.screenshot({ path: 'visual-artifacts/scan-mobile.png', fullPage: true, animations: 'disabled' });
});
