import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1]">
      <section className="relative flex min-h-screen items-center overflow-hidden border-b border-[#464932] px-8 pt-20">
        <img
          src="/bg1.jpg"
          alt="Hero race"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#131313]/70 via-[#131313]/45 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="inline-block bg-[#cfae3f] px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-black">
            Bike Challenge Series
          </p>
          <h1 className="mt-6 text-5xl font-black uppercase leading-tight md:text-8xl">
            Hari ng Ahon:
            <br />
            <span className="bg-linear-to-r from-[#cfae3f] to-white bg-clip-text text-transparent">
              Lions Head & Burham Park
            </span>
          </h1>
          <p className="mt-6 max-w-2xl border-l-2 border-[#d4f000] pl-6 text-lg text-[#c6c9ab]">
            The ultimate test of endurance and power. Conquer the legendary ascents of Baguio City and cement your
            legacy in the most grueling high-altitude cycling race in the Philippines.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/register/info"
              className="border-2 border-[#cfae3f] bg-[#cfae3f] px-8 py-4 text-xs font-bold uppercase tracking-[0.15em] text-black"
            >
              Register Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
