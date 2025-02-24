import { firebaseCred, prolificCompletionCode } from './creds'

import type { FirebaseOptions } from 'firebase/app'

export const debuggingMode: boolean = true

export const simulateMockDatabase: boolean = false

export const contactInfo: Record<'name' | 'email', string> = {
  name: 'YOUR NAME',
  email: 'YOUR@EMAIL',
}

export const prolificCUrlLive = 'https://app.prolific.com/submissions/complete'
export const prolificCUrlTest = 'https://jckend.github.io/#home'

const firebaseCredMock: FirebaseOptions = {
  apiKey: 'DUMMY-STRING',
  authDomain: 'DUMMY-STRING',
  projectId: 'DUMMY-STRING',
  storageBucket: 'DUMMY-STRING',
  messagingSenderId: 'DUMMY-STRING',
  appId: 'DUMMY-STRING',
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
export const firebaseConfig: FirebaseOptions = simulateMockDatabase ? firebaseCredMock : firebaseCred

export const prolificCCode = prolificCompletionCode
