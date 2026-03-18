import Hero from "../components/Hero";
import Features from "../components/Features";

export default function Home({ setCurrentPage }) {
  return (
    <main className="home-page">
      <Hero setCurrentPage={setCurrentPage} />
      <Features />
    </main> 
  );
}