export interface UserProfile {
  uid: string
  firstName: string
  lastName: string
  username: string
  email: string
  avatarUrl: string
  provider: 'email' | 'google'
  // Campos opcionales editables desde Ajustes → Perfil (US-04).
  bio?: string
  link?: string
  university?: string
  career?: string
  year?: string
  country?: string
}

export interface Room {
  id: string
  name: string
  hostId: string
  hostUsername: string
  createdAt?: FirebaseFirestore.Timestamp
}
