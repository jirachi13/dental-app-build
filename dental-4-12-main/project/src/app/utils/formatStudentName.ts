export const formatStudentName = (fullName: string) => {
  const normalizedName = fullName.trim().replace(/\s+/g, ' ');
  const parts = normalizedName.split(' ');

  if (parts.length < 2) {
    return normalizedName;
  }

  const firstName = parts.slice(0, -1).join(' ');
  const lastName = parts[parts.length - 1];

  return `${lastName}, ${firstName}`;
};
