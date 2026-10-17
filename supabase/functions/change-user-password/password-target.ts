export function resolvePasswordTarget(
  callerId: string,
  requestedId: unknown,
  useStoredPasswordForSelf: boolean,
): string {
  if (useStoredPasswordForSelf) {
    if (requestedId !== undefined && requestedId !== callerId) {
      throw new Error('Stored password can only reset the authenticated admin account');
    }
    return callerId;
  }
  if (typeof requestedId !== 'string' || !requestedId) {
    throw new Error('Missing required fields');
  }
  return requestedId;
}