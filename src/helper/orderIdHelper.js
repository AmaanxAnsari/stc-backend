// Generate safe 6-digit code
export const generate6DigitCode = () => {
  const timePart = Date.now().toString().slice(-3);
  const randomPart = Math.floor(100 + Math.random() * 900).toString();
  return timePart + randomPart;
};

// Generate unique ID with prefix + DB duplication check
export const generateUniqueOrderId = async (Model, prefix) => {
  let isUnique = false;
  let finalId = '';

  // Use requestId field for REPL orders, otherwise orderId
  const fieldName = prefix === 'REPL' ? 'requestId' : 'orderId';

  while (!isUnique) {
    const code = generate6DigitCode();
    const newId = `${prefix}-${code}`;

    const existing = await Model.findOne({ [fieldName]: newId });

    if (!existing) {
      isUnique = true;
      finalId = newId;
    }
  }

  return finalId;
};
