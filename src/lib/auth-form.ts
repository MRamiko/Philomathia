export function signupValidity(name: string, email: string, password: string, confirmation: string) {
  return {
    name: name.trim().length > 0,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    password: password.length >= 8,
    confirmation: confirmation.length > 0 && confirmation === password,
  };
}