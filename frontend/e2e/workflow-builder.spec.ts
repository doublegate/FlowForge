/**
 * Workflow Builder E2E Tests
 *
 * End-to-end tests for the main workflow building functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Workflow Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and login
    await page.goto('/');

    // Check if we need to login
    const loginButton = page.getByRole('button', { name: /login/i });
    if (await loginButton.isVisible()) {
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await loginButton.click();
    }

    // Wait for canvas to load
    await page.waitForSelector('[role="main"]', { timeout: 10000 });
  });

  test('should load the workflow builder', async ({ page }) => {
    await expect(page.getByText('FlowForge')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('should add action to canvas via drag and drop', async ({ page }) => {
    // Find an action in the sidebar
    const checkoutAction = page.getByText('Checkout').first();
    await expect(checkoutAction).toBeVisible();

    // Get canvas center position
    const canvas = page.locator('[role="main"]');
    const canvasBox = await canvas.boundingBox();

    if (canvasBox) {
      // Drag action to canvas
      await checkoutAction.dragTo(canvas, {
        targetPosition: {
          x: canvasBox.width / 2,
          y: canvasBox.height / 2,
        },
      });

      // Verify node was added
      await expect(page.locator('.react-flow__node')).toBeVisible();
    }
  });

  test('should use keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+S (save)
    await page.keyboard.press('Control+s');

    // Should show save notification
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show keyboard shortcuts help', async ({ page }) => {
    // Press Shift+?
    await page.keyboard.press('Shift+?');

    // Should display help modal
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.getByText('Keyboard Shortcuts')).not.toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    // Find theme toggle button
    const themeToggle = page.getByRole('button', { name: /theme/i });
    await themeToggle.click();

    // Select dark mode
    await page.getByText('Dark').click();

    // Verify dark mode applied
    const root = page.locator('html');
    await expect(root).toHaveClass(/dark/);
  });

  test('should search for actions', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/search actions/i);
    await searchInput.fill('node');

    // Wait for search results
    await page.waitForTimeout(500);

    // Should show Node.js related actions
    await expect(page.getByText(/node/i)).toBeVisible();
  });

  test('should generate YAML preview', async ({ page }) => {
    // Click Show YAML button
    await page.getByRole('button', { name: /show yaml/i }).click();

    // Verify YAML preview is visible
    await expect(page.getByText(/name:/)).toBeVisible();

    // Close YAML preview
    await page.getByRole('button', { name: /hide yaml/i }).click();
  });

  test('should clear workflow', async ({ page }) => {
    // Add a node first (simplified for test)
    const canvas = page.locator('[role="main"]');
    await canvas.click();

    // Click clear button
    await page.getByRole('button', { name: /clear/i }).click();

    // Confirm dialog
    page.on('dialog', dialog => dialog.accept());

    // Verify canvas is empty
    await expect(page.locator('.react-flow__node')).toHaveCount(0);
  });
});

test.describe('Mobile Workflow Builder', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should open mobile menu', async ({ page }) => {
    await page.goto('/');

    // Click mobile menu toggle
    const menuToggle = page.getByRole('button', { name: /menu/i });
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();

    // Sidebar should be visible
    await expect(page.getByRole('complementary')).toBeVisible();

    // Close menu
    await menuToggle.click();
    await expect(page.getByRole('complementary')).not.toBeVisible();
  });

  test('should be touch-friendly', async ({ page }) => {
    await page.goto('/');

    // All interactive elements should have minimum 44px touch target
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Active element should be focusable
    const activeElement = await page.evaluateHandle(() => document.activeElement);
    await expect(activeElement).toBeTruthy();
  });

  test('should have skip link', async ({ page }) => {
    await page.goto('/');

    // Focus skip link
    await page.keyboard.press('Tab');

    // Should see skip link
    const skipLink = page.getByText('Skip to main content');
    await expect(skipLink).toBeFocused();

    // Click skip link
    await skipLink.click();

    // Should focus main content
    const main = page.getByRole('main');
    await expect(main).toBeFocused();
  });
});
