function getSecret() {
  const secret = process.env.FIELD_ENCRYPTION_SECRET;
  if (!secret) throw new Error("FIELD_ENCRYPTION_SECRET is not set");
  return secret;
}

export const fieldEncryptionOptions = (fields: string[]) => ({
  fields,
  secret: getSecret,
  saltGenerator: (secret: string) => secret.slice(0, 16),
});
