export interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  username: string
  email: string
  avatarUrl: string
  provider: 'email' | 'google'
}

export interface Room {
  id: string
  name: string
  hostId: string
  hostUsername: string
}
