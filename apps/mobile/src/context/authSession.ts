export type AuthFlow = "login" | "registration";

export async function persistAuthToken(token: string, writeToken: (value: string) => Promise<void>, flow: AuthFlow): Promise<void> {
  try {
    await writeToken(token);
  } catch {
    if (flow === "registration") {
      throw new Error("Your account was created, but RePlate could not save your sign-in securely. Return to Log in and use this email and password; do not create the account again.");
    }
    throw new Error("Your credentials were accepted, but RePlate could not save your sign-in securely. Please try logging in again.");
  }
}
