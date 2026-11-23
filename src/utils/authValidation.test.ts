import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFirebaseAuthError,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_RANK_CALLSIGN_LENGTH,
  validateEmailAddress,
  validateEmailRegistrationInput,
  validateSignInInput,
} from './authValidation';

test('validateEmailAddress accepts non-Google and military/corporate email accounts', () => {
  const validEmails = [
    'sofia.reyes@us.af.mil',
    'pilot.407@outlook.com',
    'atlas41+ops@yahoo.com',
    'marcus.vance@icloud.com',
    'elena@proton.me',
    'ops.officer@407actg.defense.gov',
    'ajigamaliel30@gmail.com',
  ];
  for (const email of validEmails) {
    assert.equal(validateEmailAddress(email), null, `Expected ${email} to be valid`);
  }
});

test('validateEmailAddress rejects empty, malformed, and oversized addresses', () => {
  assert.notEqual(validateEmailAddress(''), null);
  assert.notEqual(validateEmailAddress('   '), null);
  assert.notEqual(validateEmailAddress('not-an-email'), null);
  assert.notEqual(validateEmailAddress('pilot@localhost'), null);
  assert.notEqual(validateEmailAddress('pilot name@outlook.com'), null);
  assert.notEqual(validateEmailAddress(`${'a'.repeat(MAX_EMAIL_LENGTH)}@test.com`), null);
});

test('validateSignInInput enforces email and non-empty password', () => {
  assert.notEqual(validateSignInInput('', 'secret123'), null);
  assert.notEqual(validateSignInInput('pilot@outlook.com', ''), null);
  assert.equal(validateSignInInput('pilot@outlook.com', 'secret123'), null);
});

test('validateEmailRegistrationInput enforces full profile, email, and password policy', () => {
  const validInput = {
    displayName: 'Capt Sofia Reyes',
    rankCallsign: 'Capt / ATLAS 41',
    email: 'sofia.reyes@outlook.com',
    password: 'FlightLine407!',
    confirmPassword: 'FlightLine407!',
  };
  assert.equal(validateEmailRegistrationInput(validInput), null);

  // Missing full name
  assert.notEqual(validateEmailRegistrationInput({ ...validInput, displayName: '   ' }), null);
  // Oversized full name
  assert.notEqual(
    validateEmailRegistrationInput({ ...validInput, displayName: 'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1) }),
    null
  );
  // Missing rank/callsign
  assert.notEqual(validateEmailRegistrationInput({ ...validInput, rankCallsign: '' }), null);
  // Oversized rank/callsign
  assert.notEqual(
    validateEmailRegistrationInput({ ...validInput, rankCallsign: 'R'.repeat(MAX_RANK_CALLSIGN_LENGTH + 1) }),
    null
  );
  // Short password
  assert.notEqual(
    validateEmailRegistrationInput({ ...validInput, password: 'short', confirmPassword: 'short' }),
    null
  );
  // Mismatched confirm password
  assert.notEqual(
    validateEmailRegistrationInput({ ...validInput, confirmPassword: 'DifferentPassword1!' }),
    null
  );
});

test('formatFirebaseAuthError produces clear messages for Firebase Auth error codes', () => {
  const opNotAllowed = formatFirebaseAuthError({ code: 'auth/operation-not-allowed' });
  assert.match(opNotAllowed, /Email\/Password/i);
  assert.match(opNotAllowed, /Firebase Console/i);

  const inUse = formatFirebaseAuthError(new Error('Firebase: Error (auth/email-already-in-use).'));
  assert.match(inUse, /already registered/i);

  const invalidCred = formatFirebaseAuthError({ code: 'auth/invalid-credential' });
  assert.match(invalidCred, /Invalid email address or password/i);

  const tooMany = formatFirebaseAuthError({ code: 'auth/too-many-requests' });
  assert.match(tooMany, /Too many/i);

  const popupClosed = formatFirebaseAuthError({ code: 'auth/popup-closed-by-user' });
  assert.match(popupClosed, /cancelled/i);
});
