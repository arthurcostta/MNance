import { readFileSync } from 'fs'
import { initializeApp } from 'firebase/app'
import { getFirestore, query, where, getDocs, collection, deleteDoc, doc } from 'firebase/firestore'

// Parsear .env.local
const envFile = readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.projectId) {
  console.error('❌ Firebase não está configurado. Verifique o arquivo .env.local')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function deleteUser(email) {
  console.log(`Deletando usuário: ${email}`)

  // Buscar usuário pelo email
  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('email', '==', email))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    console.log(`❌ Nenhum usuário encontrado com o email: ${email}`)
    return
  }

  for (const docSnap of snapshot.docs) {
    const uid = docSnap.id
    console.log(`  Deletando documento do usuário: ${uid}`)

    // Deletar subcoleções
    const subcollections = ['distribution', 'assets', 'investments', 'installments', 'scenarios', 'calendar_events']

    for (const subcol of subcollections) {
      const subcollectionRef = collection(db, 'users', uid, subcol)
      const subSnapshot = await getDocs(subcollectionRef)

      if (!subSnapshot.empty) {
        console.log(`    Deletando ${subSnapshot.size} documento(s) de ${subcol}`)
        for (const subDoc of subSnapshot.docs) {
          await deleteDoc(doc(db, 'users', uid, subcol, subDoc.id))
        }
      }
    }

    // Deletar documento do usuário
    await deleteDoc(doc(db, 'users', uid))
    console.log(`  ✓ Usuário deletado: ${uid}`)
  }

  console.log('✅ Operação concluída')
  process.exit(0)
}

const email = process.argv[2] || 'arthur.scosta1355@gmail.com'
deleteUser(email).catch((err) => {
  console.error('❌ Erro:', err)
  process.exit(1)
})
