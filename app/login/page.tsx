import { redirect } from "next/navigation";
import { CABINET_URL } from "@/src/config/links";

export default function LoginRedirectPage() {
  redirect(CABINET_URL);
}
