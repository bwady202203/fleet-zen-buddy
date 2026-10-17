import { resolvePasswordTarget } from './password-target.ts';

Deno.test('stored password reset targets only the authenticated admin', () => {
  if (resolvePasswordTarget('admin-id', undefined, true) !== 'admin-id') {
    throw new Error('Incorrect reset target');
  }
});

Deno.test('stored password reset rejects a different account', () => {
  let rejected = false;
  try {
    resolvePasswordTarget('admin-id', 'other-id', true);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error('Cross-account reset was allowed');
});