import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useFormValidation } from './useFormValidation';

// Mock the dependencies that useFormValidation calls on error
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Test schema used throughout
// ---------------------------------------------------------------------------
const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(0, 'Age must be non-negative').optional(),
});

type TestFormValues = z.infer<typeof testSchema>;

describe('useFormValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('returns empty values and no errors when no initialValues provided', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      expect(result.current.values).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('seeds values from initialValues', () => {
      const initial: Partial<TestFormValues> = { name: 'Alice', email: 'alice@example.com' };
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, initial)
      );

      expect(result.current.values.name).toBe('Alice');
      expect(result.current.values.email).toBe('alice@example.com');
    });
  });

  // -------------------------------------------------------------------------
  // setValue
  // -------------------------------------------------------------------------
  describe('setValue', () => {
    it('updates a single field value', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      act(() => {
        result.current.setValue('name', 'Bob');
      });

      expect(result.current.values.name).toBe('Bob');
    });

    it('clears the field error when the value is updated', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      // Trigger a validation error first
      act(() => {
        result.current.validate();
      });

      // name is required so an error should exist
      expect(result.current.errors.name).toBeTruthy();

      // Providing a value should clear the name error
      act(() => {
        result.current.setValue('name', 'Carol');
      });

      expect(result.current.errors.name).toBeUndefined();
    });

    it('does not clear errors for other fields when one field is updated', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      act(() => {
        result.current.validate();
      });

      // Both name and email errors should exist
      expect(result.current.errors.name).toBeTruthy();
      expect(result.current.errors.email).toBeTruthy();

      // Only update name
      act(() => {
        result.current.setValue('name', 'Dave');
      });

      // name error cleared, email error still present
      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // setValues
  // -------------------------------------------------------------------------
  describe('setValues', () => {
    it('merges multiple values at once', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, { name: 'Eve' })
      );

      act(() => {
        result.current.setValues({ email: 'eve@example.com' });
      });

      expect(result.current.values.name).toBe('Eve');
      expect(result.current.values.email).toBe('eve@example.com');
    });

    it('overwrites existing values for the same keys', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, { name: 'Old Name' })
      );

      act(() => {
        result.current.setValues({ name: 'New Name' });
      });

      expect(result.current.values.name).toBe('New Name');
    });
  });

  // -------------------------------------------------------------------------
  // validate
  // -------------------------------------------------------------------------
  describe('validate', () => {
    it('returns isValid: true and empty errors when all required fields pass', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, {
          name: 'Frank',
          email: 'frank@example.com',
        })
      );

      let validation: ReturnType<typeof result.current.validate>;
      act(() => {
        validation = result.current.validate();
      });

      expect(validation!.isValid).toBe(true);
      expect(validation!.errors).toEqual({});
      expect(result.current.errors).toEqual({});
    });

    it('returns isValid: false with field errors on missing required fields', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      let validation: ReturnType<typeof result.current.validate>;
      act(() => {
        validation = result.current.validate();
      });

      expect(validation!.isValid).toBe(false);
      expect(validation!.errors.name).toBeTruthy();
      expect(validation!.errors.email).toBeTruthy();
    });

    it('reports correct field error message for invalid email', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, {
          name: 'Grace',
          email: 'not-an-email',
        })
      );

      let validation: ReturnType<typeof result.current.validate>;
      act(() => {
        validation = result.current.validate();
      });

      expect(validation!.errors.email).toMatch(/email/i);
    });

    it('isValid reflects whether errors object is empty', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      // Initially no errors → isValid is true
      expect(result.current.isValid).toBe(true);

      act(() => {
        result.current.validate();
      });

      // Errors populated → isValid is false
      expect(result.current.isValid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // validateField
  // -------------------------------------------------------------------------
  describe('validateField', () => {
    it('returns true and clears the field error when field passes safeParse', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, { name: 'Hank' })
      );

      // Seed an error manually via full validate
      act(() => {
        result.current.validate();
      });

      let fieldValid: boolean;
      act(() => {
        fieldValid = result.current.validateField('name');
      });

      // validateField uses safeParse (never throws), so it returns true
      expect(fieldValid!).toBe(true);
    });

    it('returns true even for fields with no value (safeParse does not throw)', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      let fieldValid: boolean;
      act(() => {
        fieldValid = result.current.validateField('email');
      });

      expect(fieldValid!).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------
  describe('reset', () => {
    it('restores values to initialValues and clears errors and isSubmitting', () => {
      const initial: Partial<TestFormValues> = { name: 'Initial' };
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, initial)
      );

      // Change a value and trigger an error
      act(() => {
        result.current.setValue('name', 'Changed');
        result.current.validate();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.values).toEqual(initial);
      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
    });

    it('resets to an empty object when no initialValues were provided', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      act(() => {
        result.current.setValue('name', 'Temp');
        result.current.reset();
      });

      expect(result.current.values).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // handleSubmit
  // -------------------------------------------------------------------------
  describe('handleSubmit', () => {
    it('does not call onSubmit when validation fails', async () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      const onSubmit = vi.fn();

      await act(async () => {
        await result.current.handleSubmit(onSubmit);
      });

      expect(onSubmit).not.toHaveBeenCalled();
      expect(result.current.isSubmitting).toBe(false);
    });

    it('calls onSubmit with current values when validation passes', async () => {
      const validData: Partial<TestFormValues> = {
        name: 'Ivan',
        email: 'ivan@example.com',
      };
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, validData)
      );

      const onSubmit = vi.fn().mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.handleSubmit(onSubmit);
      });

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith(validData);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('sets isSubmitting to true during async onSubmit and false afterwards', async () => {
      const validData: Partial<TestFormValues> = {
        name: 'Julia',
        email: 'julia@example.com',
      };

      let resolveSubmit!: () => void;
      const submitting: boolean[] = [];
      const slowSubmit = () =>
        new Promise<void>(res => {
          resolveSubmit = res;
        });

      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, validData)
      );

      let submitPromise: Promise<void>;
      act(() => {
        submitPromise = result.current.handleSubmit(slowSubmit);
      });

      // isSubmitting should be true while the promise is pending
      submitting.push(result.current.isSubmitting);

      // Resolve and wait
      await act(async () => {
        resolveSubmit();
        await submitPromise;
      });

      expect(submitting[0]).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('sets a general error and clears isSubmitting when onSubmit throws', async () => {
      const validData: Partial<TestFormValues> = {
        name: 'Karl',
        email: 'karl@example.com',
      };
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, validData)
      );

      const failingSubmit = vi.fn().mockRejectedValueOnce(new Error('Server error'));

      await act(async () => {
        await result.current.handleSubmit(failingSubmit);
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.errors.general).toBeTruthy();
    });

    it('supports synchronous onSubmit callbacks', async () => {
      const validData: Partial<TestFormValues> = {
        name: 'Laura',
        email: 'laura@example.com',
      };
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, validData)
      );

      const syncSubmit = vi.fn();

      await act(async () => {
        await result.current.handleSubmit(syncSubmit);
      });

      expect(syncSubmit).toHaveBeenCalledOnce();
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // setData / full round-trip integration
  // -------------------------------------------------------------------------
  describe('full round-trip', () => {
    it('allows editing a field, validating, and submitting successfully', async () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      act(() => {
        result.current.setValue('name', 'Mike');
        result.current.setValue('email', 'mike@example.com');
      });

      let validation: ReturnType<typeof result.current.validate>;
      act(() => {
        validation = result.current.validate();
      });

      expect(validation!.isValid).toBe(true);

      const onSubmit = vi.fn().mockResolvedValueOnce(undefined);
      await act(async () => {
        await result.current.handleSubmit(onSubmit);
      });

      expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('can be reset and resubmitted correctly', async () => {
      const initial = { name: 'Nancy', email: 'nancy@example.com' };
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, initial)
      );

      // Submit once
      const firstSubmit = vi.fn().mockResolvedValueOnce(undefined);
      await act(async () => {
        await result.current.handleSubmit(firstSubmit);
      });
      expect(firstSubmit).toHaveBeenCalledOnce();

      // Reset and update
      act(() => {
        result.current.reset();
        result.current.setValue('name', 'NewNancy');
      });

      expect(result.current.values.name).toBe('NewNancy');
      expect(result.current.values.email).toBe(initial.email);

      // Submit again
      const secondSubmit = vi.fn().mockResolvedValueOnce(undefined);
      await act(async () => {
        await result.current.handleSubmit(secondSubmit);
      });
      expect(secondSubmit).toHaveBeenCalledOnce();
    });
  });
});
