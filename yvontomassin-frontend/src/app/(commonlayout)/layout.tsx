import Footer from "@/src/components/Shared/Footer";
import Header from "@/src/components/Shared/Header";

export default function CommonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header></Header>
      <main className="flex-1">{children}</main>
      <Footer></Footer>
    </>
  );
}
