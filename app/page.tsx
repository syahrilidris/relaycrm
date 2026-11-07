import { redirect } from "next/navigation"

export default function HomePage() {
  redirect(process.env.NODE_ENV === "development" ? "/demo" : "/inbox")
}
