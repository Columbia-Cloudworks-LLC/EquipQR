import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useFormValidation, type ValidationResult } from './useFormValidation';

vi.mock('@/utils/errorHandling', () => ({
  showErrorToast: vi.fn(() => ({
    message: 'Server error',
  })),
}));

const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(0, 'Age must be non-negative').optional(),
});

type TestFormValues = z.infer<typeof testSchema>;
type SubmitHandler = (values: TestFormValues) => Promise<void> | void;

const runValidation = (validate: () => ValidationResult): ValidationResult => {
  let validation: ValidationResult | undefined;

  act(() => {
    validation = validate();
  });

  if (!validation) {
    throw new Error('Expected validation result to be initialized');
  }

  return validation;
};

const runFieldValidation = (validateField: () => boolean): boolean => {
  let isValid: boolean | undefined;

  act(() => {
    isValid = validateField();
  });

  if (isValid === undefined) {
    throw new Error('Expected field validation result to be initialized');
  }

  return isValid;
};

const createDeferred = () => {
  let resolve: () => void = () => {
    throw new Error('Deferred submit resolved before initialization');
  };

  const promise = new Promise<void>(res => {
    resolve = res;
  });

  return { promise, resolve };
};

const startSubmit = (submit: () => Promise<void>): Promise<void> => {
  let submitPromise: Promise<void> | undefined;

  act(() => {
    submitPromise = submit();
  });

  if (!submitPromise) {
    throw new Error('Expected submit promise to be initialized');
  }

  return submitPromise;
};

describe('useFormValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.name).toBeTruthy();

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

      expect(result.current.errors.name).toBeTruthy();
      expect(result.current.errors.email).toBeTruthy();

      act(() => {
        result.current.setValue('name', 'Dave');
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBeTruthy();
    });
  });

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

  describe('validate', () => {
    it('returns isValid: true and empty errors when all required fields pass', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, {
          name: 'Frank',
          email: 'frank@example.com',
        })
      );

      const validation = runValidation(result.current.validate);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual({});
      expect(result.current.errors).toEqual({});
    });

    it('returns isValid: false with field errors on missing required fields', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      const validation = runValidation(result.current.validate);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.name).toBeTruthy();
      expect(validation.errors.email).toBeTruthy();
    });

    it('reports correct field error message for invalid email', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, {
          name: 'Grace',
          email: 'not-an-email',
        })
      );

      const validation = runValidation(result.current.validate);

      expect(validation.errors.email).toMatch(/email/i);
    });

    it('isValid reflects whether errors object is empty', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      expect(result.current.isValid).toBe(true);

      act(() => {
        result.current.validate();
      });

      expect(result.current.isValid).toBe(false);
    });
  });

  describe('validateField', () => {
    it('returns true and clears the field error when field passes safeParse', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, { name: 'Hank' })
      );

      act(() => {
        result.current.validate();
      });

      const fieldValid = runFieldValidation(() => result.current.validateField('name'));

      expect(fieldValid).toBe(true);
    });

    it('returns true even for fields with no value (safeParse does not throw)', () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      const fieldValid = runFieldValidation(() => result.current.validateField('email'));

      expect(fieldValid).toBe(true);
    });
  });

  describe('reset', () => {
    it('restores values to initialValues and clears errors and isSubmitting', () => {
      const initial: Partial<TestFormValues> = { name: 'Initial' };
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, initial)
      );

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

  describe('handleSubmit', () => {
    it('does not call onSubmit when validation fails', async () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      const onSubmit = vi.fn<SubmitHandler>();

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

      const onSubmit = vi.fn<(values: TestFormValues) => Promise<void>>()
        .mockResolvedValueOnce(undefined);

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

      const submit = createDeferred();
      const submitting: boolean[] = [];
      const slowSubmit = vi.fn<(values: TestFormValues) => Promise<void>>(
        () => submit.promise
      );

      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema, validData)
      );

      const submitPromise = startSubmit(() => result.current.handleSubmit(slowSubmit));

      submitting.push(result.current.isSubmitting);

      await act(async () => {
        submit.resolve();
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

      const failingSubmit = vi.fn<(values: TestFormValues) => Promise<void>>()
        .mockRejectedValueOnce(new Error('Server error'));

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

      const syncSubmit = vi.fn<(values: TestFormValues) => void>();

      await act(async () => {
        await result.current.handleSubmit(syncSubmit);
      });

      expect(syncSubmit).toHaveBeenCalledOnce();
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('full round-trip', () => {
    it('allows editing a field, validating, and submitting successfully', async () => {
      const { result } = renderHook(() =>
        useFormValidation<TestFormValues>(testSchema)
      );

      act(() => {
        result.current.setValue('name', 'Mike');
        result.current.setValue('email', 'mike@example.com');
      });

      const validation = runValidation(result.current.validate);

      expect(validation.isValid).toBe(true);

      const onSubmit = vi.fn<(values: TestFormValues) => Promise<void>>()
        .mockResolvedValueOnce(undefined);
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

      const firstSubmit = vi.fn<(values: TestFormValues) => Promise<void>>()
        .mockResolvedValueOnce(undefined);
      await act(async () => {
        await result.current.handleSubmit(firstSubmit);
      });
      expect(firstSubmit).toHaveBeenCalledOnce();

      act(() => {
        result.current.reset();
        result.current.setValue('name', 'NewNancy');
      });

      expect(result.current.values.name).toBe('NewNancy');
      expect(result.current.values.email).toBe(initial.email);

      const secondSubmit = vi.fn<(values: TestFormValues) => Promise<void>>()
        .mockResolvedValueOnce(undefined);
      await act(async () => {
        await result.current.handleSubmit(secondSubmit);
      });
      expect(secondSubmit).toHaveBeenCalledOnce();
    });
  });
});
