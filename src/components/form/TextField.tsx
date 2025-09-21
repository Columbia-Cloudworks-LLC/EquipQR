import React from 'react';
import { FieldPath, FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';

interface TextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  label?: string;
  placeholder?: string;
  description?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
}

const TextField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  placeholder,
  description,
  type = 'text',
  disabled = false,
  required = false,
  className,
  inputClassName,
}: TextFieldProps<TFieldValues, TName>) => {
  return (
    <FormField
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel className={required ? 'after:content-["*"] after:ml-1 after:text-destructive' : ''}>
              {label}
            </FormLabel>
          )}
          <FormControl>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(inputClassName)}
              aria-invalid={fieldState.error ? 'true' : 'false'}
              aria-describedby={
                description 
                  ? `${name}-description` 
                  : fieldState.error 
                    ? `${name}-error` 
                    : undefined
              }
            />
          </FormControl>
          {description && (
            <FormDescription id={`${name}-description`}>
              {description}
            </FormDescription>
          )}
          <FormMessage id={`${name}-error`} />
        </FormItem>
      )}
    />
  );
};

export default TextField;

