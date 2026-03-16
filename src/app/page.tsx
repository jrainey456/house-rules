import { Eater } from "next/font/google";

const eater = Eater({ subsets: ["latin"], weight: "400" });

export default function Home() {
  return (
    <h1 className={eater.className} style={{ textAlign: "center", marginTop: "40vh", fontSize: "30vw", lineHeight: 1 }}>HIDE</h1>
  );
}
