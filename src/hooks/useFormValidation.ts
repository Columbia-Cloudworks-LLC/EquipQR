
import { useState, useCallback } from 'react';
import { ZodSchema, ZodError } from 'zod';
import { showErrorToast } from '@/utils/errorHandling';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FormValidationHook<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setValues: (values: Partial<T>) => void;
  validate: () => ValidationResult;
  validateField: (field: keyof T) => boolean;
  reset: () => void;
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => Promise<void>;
}

export const useFormValidation = <T extends Record<string, unknown>>(
  schema: ZodSchema<T>,
  initialValues: Partial<T> = {}
): FormValidationHook<T> => {
  const [values, setValuesState] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    // Clear field error when value changes
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  }, [errors]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const validate = useCallback((): ValidationResult => {
    try {
      schema.parse(values);
      setErrors({});
      return { isValid: true, errors: {} };
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const pathHead = issue.path[0];
          if (typeof pathHead === 'string') {
            fieldErrors[pathHead] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return { isValid: false, errors: fieldErrors };
      }
      return { isValid: false, errors: { general: 'Validation failed' } };
    }
  }, [values, schema]);

  const validateField = useCallback((field: keyof T): boolean => {
    try {
      // Create a simple validation for the specific field
      const fieldValue = values[field];
      const testObject = { [field]: fieldValue } as Partial<T>;
      
      // Try to validate just this field by creating a partial schema
      const result = schema.safeParse(testObject);

      if (!result.success) {
        const fieldError = result.error.issues.find((issue) => issue.path[0] === field);

        if (fieldError) {
          setErrors(prev => ({ ...prev, [field as string]: fieldError.message }));
          return false;
        }
      }
      
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldError = error.issues[0]?.message || 'Invalid value';
        setErrors(prev => ({ ...prev, [field as string]: fieldError }));
      }
      return false;
    }
  }, [values, schema]);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(async (onSubmit: (values: T) => Promise<void> | void) => {
    const validation = validate();
    if (!validation.isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values as T);
    } catch (error) {
      console.error('Form submission error:', error);
      const standardError = showErrorToast(error, 'Form Submission');
      setErrors({ general: standardError.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    isValid,
    isSubmitting,
    setValue,
    setValues,
    validate,
    validateField,
    reset,
    handleSubmit
  };
};
