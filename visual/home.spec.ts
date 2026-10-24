import { test, expect } from '@playwright/test';
import fs from 'node:fs';
fs.mkdirSync('visual-artifacts', { recursive: true });

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


for (const width of [360, 768, 1440]) {
  test(`account and dashboard interactions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width, height:900});
    await page.route('**/api/config',r=>r.fulfill({json:{turnstileSiteKey:null,notificationsEnabled:true}}));
    await page.goto('/anmelden');
    await expect(page.getByRole('button',{name:'Code per E-Mail senden'})).toBeVisible();
    await expect(page.locator('input[type=email]')).toBeVisible();
    await page.screenshot({path:`visual-artifacts/auth-${width}.png`,fullPage:true,animations:'disabled'});
    await page.route('**/api/auth/me',r=>r.fulfill({json:{user:{email:'design@example.com'}}}));
    await page.route('**/api/codes',r=>r.fulfill({json:{codes:[{id:'test',slug:'example-vehicle',label:'Mein Fahrzeug',theme:'galactic_twilight',active:1,views:24,message_count:3}]}}));
    await page.route('**/api/messages',r=>r.fulfill({json:{messages:[{id:'notice',reason:'lights',note:'Das Licht auf der Fahrerseite ist noch an.',vehicle_label:'Mein Fahrzeug',created_at:1792840000,is_read:0,emailed:1}]}}));
    await page.goto('/app');
    await expect(page.getByRole('button',{name:/Mein Fahrzeug/})).toBeVisible();
    await page.screenshot({path:`visual-artifacts/dashboard-${width}.png`,fullPage:true,animations:'disabled'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.getByRole('button',{name:'Neuer QR-Code',exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({path:`visual-artifacts/modal-${width}.png`,animations:'disabled'});
    await page.getByRole('button',{name:'Schließen',exact:true}).click();
    await page.getByRole('button',{name:/Postfach/}).click();
    await expect(page.getByText('Licht ist an',{exact:true})).toBeVisible();
    await page.screenshot({path:`visual-artifacts/inbox-${width}.png`,fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'Konto',exact:true}).click();
    await expect(page.getByRole('button',{name:'Abmelden'})).toBeVisible();
    await page.screenshot({path:`visual-artifacts/settings-${width}.png`,fullPage:true,animations:'disabled'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  });
}
test('scan submits selected reason and shows success',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.route('**/api/config',r=>r.fulfill({json:{turnstileSiteKey:null,notificationsEnabled:false}}));
 await page.route('**/api/public/*',r=>r.fulfill({json:{active:true,ok:true}}));
 await page.goto('/q/test');
 await page.getByRole('button',{name:'Fenster offen'}).click();
 await expect(page.getByRole('button',{name:'Fenster offen'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Hinweis senden'}).click();
 await expect(page.getByRole('heading',{name:'Danke fürs Bescheidgeben!'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
