export function parseApiError(err) {
  const env = err?.response?.data;
  if (env?.errors) {
    return { fields: env.errors, message: env.message || 'Validation failed.' };
  }
  if (env?.message) {
    return { fields: {}, message: env.message };
  }
  if (err?.message) {
    return { fields: {}, message: err.message };
  }
  return { fields: {}, message: 'Unexpected error.' };
}
