import HomeComponent from "@/src/components/home/Home";
import Header from "../components/Shared/Header";
import Footer from "../components/Shared/Footer";

export default function Home() {
  return (
    <>
      <Header></Header>
      <main className="flex-1">
        <HomeComponent />
      </main>
      <Footer></Footer>
    </>
  );
}
