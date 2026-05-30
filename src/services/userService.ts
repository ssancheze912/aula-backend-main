import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '../config/firebase'
import type { UserProfile } from '../types'
import { defaultAvatarUrl, isValidUsername, normalizeUsername } from '../utils/validation'

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const usernameKey = normalizeUsername(username)
  const snap = await adminDb.collection('usernames').doc(usernameKey).get()
  return !snap.exists
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await adminDb.collection('users').doc(uid).get()
  if (!snap.exists) return null
  return snap.data() as UserProfile
}

export interface CreateUserProfileInput {
  uid: string
  firstName: string
  lastName: string
  username: string
  email: string
  avatarUrl?: string
  provider: 'email' | 'google'
}

export async function createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
  const usernameKey = normalizeUsername(input.username)
  const usernameRef = adminDb.collection('usernames').doc(usernameKey)
  const userRef = adminDb.collection('users').doc(input.uid)

  const [existingUser, usernameSnap] = await Promise.all([userRef.get(), usernameRef.get()])

  if (existingUser.exists) {
    throw new ProfileAlreadyExistsError()
  }

  if (usernameSnap.exists && usernameSnap.data()?.uid !== input.uid) {
    throw new UsernameTakenError()
  }

  const profile: UserProfile = {
    uid: input.uid,
    firstName: input.firstName,
    lastName: input.lastName,
    username: usernameKey,
    email: input.email,
    avatarUrl: input.avatarUrl ?? defaultAvatarUrl(input.firstName, usernameKey),
    provider: input.provider,
  }

  const batch = adminDb.batch()
  batch.set(userRef, {
    ...profile,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  batch.set(usernameRef, { uid: input.uid })
  await batch.commit()

  return profile
}

export class ProfileAlreadyExistsError extends Error {
  constructor() {
    super('El usuario ya tiene un perfil')
    this.name = 'ProfileAlreadyExistsError'
  }
}

export class UsernameTakenError extends Error {
  constructor() {
    super('Username ya está en uso')
    this.name = 'UsernameTakenError'
  }
}

export class ProfileNotFoundError extends Error {
  constructor() {
    super('Perfil no encontrado')
    this.name = 'ProfileNotFoundError'
  }
}

export interface UpdateUserProfileInput {
  firstName?: string
  lastName?: string
  username?: string
  avatarUrl?: string
}

export async function updateUserProfile(
  uid: string,
  input: UpdateUserProfileInput
): Promise<UserProfile> {
  const userRef = adminDb.collection('users').doc(uid)
  const existingSnap = await userRef.get()

  if (!existingSnap.exists) {
    throw new ProfileNotFoundError()
  }

  const existing = existingSnap.data() as UserProfile
  const nextFirstName = input.firstName ?? existing.firstName
  const nextLastName = input.lastName ?? existing.lastName
  const nextAvatarUrl = input.avatarUrl ?? existing.avatarUrl

  let nextUsername = existing.username
  const batch = adminDb.batch()

  if (input.username != null) {
    const usernameKey = normalizeUsername(input.username)
    if (!isValidUsername(usernameKey)) {
      throw new InvalidUsernameError()
    }

    if (usernameKey !== existing.username) {
      const usernameRef = adminDb.collection('usernames').doc(usernameKey)
      const usernameSnap = await usernameRef.get()

      if (usernameSnap.exists && usernameSnap.data()?.uid !== uid) {
        throw new UsernameTakenError()
      }

      batch.delete(adminDb.collection('usernames').doc(existing.username))
      batch.set(usernameRef, { uid })
      nextUsername = usernameKey
    }
  }

  const profile: UserProfile = {
    uid,
    firstName: nextFirstName,
    lastName: nextLastName,
    username: nextUsername,
    email: existing.email,
    avatarUrl: nextAvatarUrl,
    provider: existing.provider,
  }

  batch.update(userRef, {
    ...profile,
    updatedAt: FieldValue.serverTimestamp(),
  })
  await batch.commit()

  return profile
}

export async function deleteUserProfile(uid: string): Promise<void> {
  const userRef = adminDb.collection('users').doc(uid)
  const existingSnap = await userRef.get()

  if (!existingSnap.exists) {
    throw new ProfileNotFoundError()
  }

  const existing = existingSnap.data() as UserProfile
  const batch = adminDb.batch()
  batch.delete(userRef)
  batch.delete(adminDb.collection('usernames').doc(existing.username))
  await batch.commit()
}

export class InvalidUsernameError extends Error {
  constructor() {
    super('Username inválido')
    this.name = 'InvalidUsernameError'
  }
}
