import { getProfile } from "@/lib/actions";
import { FooterContent } from "@/components/public/footer-content";

export async function Footer() {
  const profile = await getProfile();
  return <FooterContent profile={profile} />;
}
