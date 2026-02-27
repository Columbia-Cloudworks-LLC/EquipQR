Create comprehensive unit tests for the specified code using Vitest + React Testing Library, following the project's testing conventions.

$ARGUMENTS

## Steps

1. **Test Coverage**
   - Test all public methods and functions
   - Cover edge cases and error conditions
   - Test both positive and negative scenarios
   - Aim for high code coverage

2. **Test Structure**
   - Use Vitest + React Testing Library
   - Co-locate tests with source (e.g., `Feature.tsx` -> `Feature.test.tsx`)
   - Write clear, descriptive test names
   - Follow the Arrange-Act-Assert pattern
   - Group related tests logically

3. **Test Cases to Include**
   - Happy path scenarios
   - Edge cases and boundary conditions
   - Error handling and exception cases
   - Mock Supabase client calls and service layer functions
   - Do not mock internal component state

4. **Test Quality**
   - Make tests independent and isolated
   - Ensure tests are deterministic and repeatable
   - Keep tests simple and focused on one thing
   - Use accessible selectors (`getByRole`, `getByLabelText`) over `getByTestId`
   - Test behavior, not implementation details

## Checklist

- [ ] All public methods and functions tested
- [ ] Edge cases and error conditions covered
- [ ] Vitest + RTL conventions followed
- [ ] Arrange-Act-Assert pattern used
- [ ] External dependencies mocked appropriately
- [ ] Tests are independent, isolated, and deterministic
