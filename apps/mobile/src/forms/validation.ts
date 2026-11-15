export type FormErrors = Record<string, string>;

export function clearFormError(errors: FormErrors, field: string): FormErrors {
  const next = { ...errors };
  delete next[field];
  return next;
}

// Match the backend Zod email format (including a 2+ letter top-level domain).
const emailPattern = /^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Email is required.";
  if (email.length > 254 || !emailPattern.test(email)) return "Enter a valid email address.";
  return undefined;
}

export function validateLogin(values: { email: string; password: string }): FormErrors {
  const errors: FormErrors = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = "Password is required.";
  return errors;
}

export type RegistrationValues = {
  name: string;
  email: string;
  password: string;
  role: "DONOR" | "NGO" | "VOLUNTEER";
  organizationName?: string;
  address?: string;
};

export function validateRegistration(values: RegistrationValues): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Your name is required.";
  else if (name.length < 2 || name.length > 100) errors.name = "Name must be between 2 and 100 characters.";
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = "Password is required.";
  else if (values.password.length < 8 || values.password.length > 100) errors.password = "Password must be between 8 and 100 characters.";
  if (values.role === "NGO") {
    const organizationName = values.organizationName?.trim() ?? "";
    const address = values.address?.trim() ?? "";
    if (!organizationName) errors.organizationName = "Organization name is required.";
    else if (organizationName.length < 2 || organizationName.length > 120) errors.organizationName = "Organization name must be between 2 and 120 characters.";
    if (!address) errors.address = "Organization address is required.";
    else if (address.length < 5 || address.length > 250) errors.address = "Address must be between 5 and 250 characters.";
  }
  return errors;
}

export type DonationValues = {
  foodName: string;
  category: string;
  quantity: string;
  unit: string;
  preparedAt: Date | null;
  collectionDeadline: Date | null;
  pickupAddress: string;
  description: string;
};

export function validateDonation(values: DonationValues, now = new Date()): FormErrors {
  const errors: FormErrors = {};
  const foodName = values.foodName.trim();
  const category = values.category.trim();
  const unit = values.unit.trim();
  const address = values.pickupAddress.trim();
  const quantity = Number(values.quantity);
  if (!foodName) errors.foodName = "Food name is required.";
  else if (foodName.length < 2 || foodName.length > 120) errors.foodName = "Food name must be between 2 and 120 characters.";
  if (!category) errors.category = "Category is required.";
  else if (category.length < 2 || category.length > 60) errors.category = "Category must be between 2 and 60 characters.";
  if (!values.quantity.trim()) errors.quantity = "Quantity is required.";
  else if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) errors.quantity = "Enter a whole quantity between 1 and 100,000.";
  if (!unit) errors.unit = "Unit is required.";
  else if (unit.length > 30) errors.unit = "Unit must be 30 characters or fewer.";
  if (!values.preparedAt || !Number.isFinite(values.preparedAt.getTime())) errors.preparedAt = "Select a valid preparation date and time.";
  if (!values.collectionDeadline || !Number.isFinite(values.collectionDeadline.getTime())) errors.collectionDeadline = "Select a valid collection deadline.";
  if (values.preparedAt && Number.isFinite(values.preparedAt.getTime()) && values.collectionDeadline && Number.isFinite(values.collectionDeadline.getTime())) {
    if (values.collectionDeadline <= values.preparedAt) errors.collectionDeadline = "Collection deadline must be after preparation.";
    if (values.collectionDeadline <= now) errors.collectionDeadline = "Collection deadline must be in the future.";
  }
  if (!address) errors.pickupAddress = "Pickup address is required.";
  else if (address.length < 5 || address.length > 300) errors.pickupAddress = "Address must be between 5 and 300 characters.";
  if (values.description.length > 1000) errors.description = "Notes must be 1,000 characters or fewer.";
  return errors;
}

export function validateRequestQuantity(value: string, available: number): string | undefined {
  if (!value.trim()) return "Quantity is required.";
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) return "Enter a positive whole number.";
  if (quantity > available) return `Only ${available} available.`;
  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const failure = error as {
    response?: { status?: number; data?: { error?: { code?: unknown; message?: unknown; details?: unknown } } };
    request?: unknown;
    code?: unknown;
    message?: unknown;
    config?: { baseURL?: unknown };
  };
  const response = failure.response;
  const apiError = response?.data?.error;
  if (Array.isArray(apiError?.details)) {
    const messages = apiError.details
      .map((item: any) => {
        if (typeof item?.message !== "string") return "";
        const path = Array.isArray(item.path) ? item.path.filter((part: unknown) => typeof part === "string" || typeof part === "number").join(".") : "";
        return path ? `${path}: ${item.message}` : item.message;
      })
      .filter(Boolean);
    if (messages.length) return [...new Set(messages)].join(" ");
  }
  if (typeof apiError?.message === "string") {
    const code = typeof apiError.code === "string" ? ` (${apiError.code})` : "";
    const status = typeof response?.status === "number" ? ` — HTTP ${response.status}` : "";
    return `${apiError.message}${code}${status}`;
  }
  if (failure.request) {
    const endpoint = typeof failure.config?.baseURL === "string" ? ` at ${failure.config.baseURL}` : "";
    const cause = typeof failure.message === "string" && failure.message ? ` (${failure.message}${typeof failure.code === "string" ? `, ${failure.code}` : ""})` : "";
    return `Could not reach the RePlate API${endpoint}. Check that the backend is running and the phone is on the same Wi-Fi network${cause}.`;
  }
  if (typeof failure.message === "string" && failure.message) return failure.message;
  if (typeof response?.status === "number") return `${fallback} (HTTP ${response.status})`;
  return fallback;
}

export function getApiValidationErrors(error: unknown): FormErrors {
  if (!error || typeof error !== "object") return {};
  const details = (error as { response?: { data?: { error?: { details?: unknown } } } }).response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  const errors: FormErrors = {};
  for (const detail of details) {
    if (!detail || typeof detail !== "object" || typeof (detail as { message?: unknown }).message !== "string") continue;
    const path = (detail as { path?: unknown }).path;
    if (Array.isArray(path) && path.length === 1 && typeof path[0] === "string") errors[path[0]] = (detail as { message: string }).message;
  }
  return errors;
}

export function createSubmissionGuard() {
  let inFlight = false;
  return async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    if (inFlight) return undefined;
    inFlight = true;
    try {
      return await action();
    } finally {
      inFlight = false;
    }
  };
}
