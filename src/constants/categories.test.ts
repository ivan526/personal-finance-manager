import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES } from '../constants/categories';

describe('DEFAULT_CATEGORIES', () => {
  it('should have at least one category', () => {
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0);
  });

  it('should have unique ids', () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have required fields', () => {
    DEFAULT_CATEGORIES.forEach((cat) => {
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeDefined();
      expect(cat.type).toBeDefined();
      expect(cat.icon).toBeDefined();
      expect(cat.color).toBeDefined();
    });
  });

  it('should only have valid transaction types', () => {
    DEFAULT_CATEGORIES.forEach((cat) => {
      expect(['income', 'expense']).toContain(cat.type);
    });
  });

  it('should have valid hex color format', () => {
    const hex = /^#[0-9A-Fa-f]{6}$/;
    DEFAULT_CATEGORIES.forEach((cat) => {
      expect(hex.test(cat.color)).toBe(true);
    });
  });

  it('should have both income and expense categories', () => {
    const types = DEFAULT_CATEGORIES.map((c) => c.type);
    expect(types).toContain('income');
    expect(types).toContain('expense');
  });

  it('should have expected categories', () => {
    const ids = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(ids).toContain('food');
    expect(ids).toContain('transport');
    expect(ids).toContain('salary');
  });
});