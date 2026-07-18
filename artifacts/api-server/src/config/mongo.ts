import mongoose from "mongoose"
import { env } from "./env.js"

let connected = false

export async function connectMongo() {
  if (connected) return
  if (!env.MONGO_URI) {
    throw new Error("MONGO_URI is required to connect to MongoDB")
  }
  await mongoose.connect(env.MONGO_URI, { dbName: env.MONGO_DB })
  connected = true
}
