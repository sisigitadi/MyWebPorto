import { OSMenubar } from "@/components/public/os/os-menubar";
import { getProfile } from "@/lib/actions";

export async function Header() {
  const profile = await getProfile();
  return <OSMenubar profile={profile} />;
}
