import { validDisplayName } from './display-name';
export function signupValidity(name: string, email: string, password: string, confirmation: string) {
  return {
    name: validDisplayName(name),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    password: password.length >= 8,
    confirmation: confirmation.length > 0 && confirmation === password,
  };
}