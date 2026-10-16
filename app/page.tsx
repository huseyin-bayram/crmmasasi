import { redirect } from "next/navigation";
import { appConfig } from "@/lib/app-config";

export default function HomePage() {
  redirect(appConfig.basePath);
}
