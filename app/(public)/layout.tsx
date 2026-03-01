import FooterLinksBlock from "@/app/components/FooterLinksBlock";
import PaymentBlock from "@/app/components/PaymentBlock";
import LegalFooter from "@/app/components/legal/LegalFooter";
import BottomNav from "@/app/components/BottomNav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FooterLinksBlock />
      <PaymentBlock />
      <LegalFooter />
      <BottomNav />
    </>
  );
}
