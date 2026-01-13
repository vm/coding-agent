# Code Review Checklist

Use this checklist as a reference when reviewing code:

## Correctness
- [ ] Logic is sound and handles edge cases
- [ ] Error handling is appropriate
- [ ] Input validation is present where needed
- [ ] No off-by-one errors or boundary issues
- [ ] Race conditions or concurrency issues addressed

## Readability
- [ ] Variable and function names are clear and descriptive
- [ ] Code is self-documenting (minimal comments needed)
- [ ] Complex logic is broken into smaller functions
- [ ] Consistent formatting and style

## Maintainability
- [ ] No code duplication (DRY principle)
- [ ] Functions have single responsibility
- [ ] Dependencies are clear and minimal
- [ ] Code is organized logically

## Best Practices
- [ ] Follows language-specific idioms
- [ ] Uses appropriate data structures
- [ ] Proper use of types (if applicable)
- [ ] Follows project conventions

## Security
- [ ] No hardcoded secrets or credentials
- [ ] Input sanitization where needed
- [ ] Proper authentication/authorization checks
- [ ] No SQL injection or XSS vulnerabilities

## Performance
- [ ] No unnecessary loops or operations
- [ ] Efficient algorithms and data structures
- [ ] Proper resource cleanup (memory, files, connections)
- [ ] Lazy loading where appropriate

